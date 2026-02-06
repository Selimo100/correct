-- Fix Infinite Recursion in RLS policies

-- 1. Create a helper function to check membership bypassing RLS
-- This is critical to break the loop: group_members -> groups -> group_members
CREATE OR REPLACE FUNCTION public.fn_check_is_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges, bypassing RLS
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

-- 2. Update Groups SELECT Policy
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;

CREATE POLICY "groups_select_policy"
ON public.groups
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR 
  -- Use the secure function instead of direct subquery
  public.fn_check_is_member(id, auth.uid())
);

-- 3. Update Group Members SELECT Policy
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;

CREATE POLICY "group_members_select_policy"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  -- I am the member in this row
  user_id = auth.uid()
  OR 
  -- I am the owner of the group (This queries `groups`, triggering its RLS)
  -- The `groups` RLS now uses `fn_check_is_member` (no RLS), so this is safe.
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
      AND g.owner_id = auth.uid()
  )
  OR
  -- I am a fellow member of the group
  public.fn_check_is_member(group_id, auth.uid())
);
