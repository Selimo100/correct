-- Fix Groups RLS and Functionality

-- 1. Reset Policies
DROP POLICY IF EXISTS "Owners can see their groups" ON public.groups;
DROP POLICY IF EXISTS "Group members can see groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "groups_select_owner_or_member" ON public.groups; 
DROP POLICY IF EXISTS "Owners can manage groups" ON public.groups;
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_update_delete_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;


DROP POLICY IF EXISTS "Owners can view members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Members can view other members of same group" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_owner_or_member" ON public.group_members; 
DROP POLICY IF EXISTS "Owners can manage members" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_policy" ON public.group_members;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- 2. Groups Policies

-- A) SELECT: Owner OR Member
CREATE POLICY "groups_select_policy"
ON public.groups
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id
      AND gm.user_id = auth.uid()
  )
);

-- B) INSERT: Owner only (must match auth.uid)
CREATE POLICY "groups_insert_policy"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

-- C) UPDATE/DELETE: Owner only
CREATE POLICY "groups_update_delete_policy"
ON public.groups
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "groups_delete_policy"
ON public.groups
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());


-- 3. Group Members Policies

-- A) SELECT: Member of the group OR Owner of the group
CREATE POLICY "group_members_select_policy"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  -- I am the member
  user_id = auth.uid()
  OR 
  -- I am in the group
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
  )
  OR
  -- I am the owner of the group
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
      AND g.owner_id = auth.uid()
  )
);

-- B) INSERT/DELETE: Owner of the group only
-- (Assuming only owners add/remove members for now)
CREATE POLICY "group_members_insert_policy"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
     SELECT 1 FROM public.groups g
     WHERE g.id = group_members.group_id
       AND g.owner_id = auth.uid()
  )
);

CREATE POLICY "group_members_delete_policy"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
     SELECT 1 FROM public.groups g
     WHERE g.id = group_members.group_id
       AND g.owner_id = auth.uid()
  )
);

-- 4. Create Group Function (Updated)
-- Ensures owner is added as a member automatically
DROP FUNCTION IF EXISTS fn_create_group(text, text);
CREATE OR REPLACE FUNCTION fn_create_group(p_name text, p_description text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  INSERT INTO public.groups (owner_id, name, description)
  VALUES (auth.uid(), p_name, p_description)
  RETURNING id INTO v_group_id;

  -- Auto-add owner as member
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid());

  RETURN jsonb_build_object('id', v_group_id, 'name', p_name);
END;
$$;

-- 5. Helper RPC to list my groups with counts
DROP FUNCTION IF EXISTS fn_list_my_groups();
CREATE OR REPLACE FUNCTION fn_list_my_groups()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  owner_id uuid,
  created_at timestamptz,
  member_count bigint,
  is_owner boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.description,
    g.owner_id,
    g.created_at,
    (SELECT count(*) FROM public.group_members gm WHERE gm.group_id = g.id)::bigint as member_count,
    (g.owner_id = auth.uid()) as is_owner
  FROM public.groups g
  WHERE 
    g.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = g.id 
      AND gm.user_id = auth.uid()
    )
  ORDER BY g.created_at DESC;
END;
$$;
