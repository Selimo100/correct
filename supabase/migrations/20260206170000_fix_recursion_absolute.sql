-- Fix Infinite Recursion by decoupling checking logic into Security Definer functions

-- 1. Helper: Check if user is a member of a group (Bypasses RLS)
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

-- 2. Helper: Check if user is owner of a group (Bypasses RLS)
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

-- 3. Groups Policy (Update)
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;

CREATE POLICY "groups_select_policy"
ON public.groups
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR 
  public.fn_check_is_member(id, auth.uid())
);

-- 4. Group Members Policy (Update)
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;

CREATE POLICY "group_members_select_policy"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  -- I am the member
  user_id = auth.uid()
  OR
  -- I am the owner of the group context (Uses helper to avoid recursing back to groups RLS)
  public.fn_check_is_group_owner(group_id, auth.uid())
  OR
  -- I am a fellow member (Uses helper to avoid recursing back to group_members RLS)
  public.fn_check_is_member(group_id, auth.uid())
);
