-- Fix Infinite Recursion: Nuclear Option and Cleanup
-- Drops ALL related policies and uses SECURITY DEFINER functions for cleaner access control.

-- 1. Helper Function: Check Member (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.fn_check_is_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = p_group_id 
    AND user_id = p_user_id
  );
END;
$$;

-- 2. Helper Function: Check Owner (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.fn_check_is_group_owner(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id 
    AND owner_id = p_user_id
  );
END;
$$;

-- 3. DROP ALL EXISTING POLICIES on groups and group_members to clear conflicts
-- (Using DO block to handle potential missing policies gracefully if names vary, 
-- but explicit DROPs are better for migration history. We list all known variants.)

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

-- 4. Apply NEW Clean Policies

-- Groups
CREATE POLICY "groups_select_policy"
ON public.groups
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR 
  public.fn_check_is_member(id, auth.uid())
);

CREATE POLICY "groups_insert_policy"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "groups_update_delete_policy"
ON public.groups
FOR ALL
TO authenticated
USING (owner_id = auth.uid());

-- Group Members
CREATE POLICY "group_members_select_policy"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  -- Use secure functions to avoid RLS loops
  OR public.fn_check_is_group_owner(group_id, auth.uid())
  OR public.fn_check_is_member(group_id, auth.uid())
);

CREATE POLICY "group_members_insert_policy"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.fn_check_is_group_owner(group_id, auth.uid())
);

CREATE POLICY "group_members_delete_policy"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  public.fn_check_is_group_owner(group_id, auth.uid())
);

-- 5. Force Refresh of Schema Cache (Optional but good practice)
NOTIFY pgrst, 'reload schema';
