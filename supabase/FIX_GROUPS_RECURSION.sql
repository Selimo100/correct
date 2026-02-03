-- Fix Infinite Recursion in Group Policies

-- 1. Create a secure function to check group membership (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.fn_is_group_member(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: executes with owner privileges, bypassing RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE group_id = p_group_id 
    AND user_id = p_user_id
  );
END;
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Group members can see groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Members can view other members of same group" ON public.group_members;

-- 3. Recreate policies using the secure function

-- Groups: Owners see their groups + Members see groups they are in
CREATE POLICY "Group members can see groups they belong to"
  ON public.groups FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR 
    public.fn_is_group_member(id, auth.uid())
  );

-- Group Members: See if you are the user OR if you are in the same group
CREATE POLICY "Members can view other members of same group"
  ON public.group_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    public.fn_is_group_member(group_id, auth.uid())
  );
