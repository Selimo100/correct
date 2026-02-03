-- Migration 018: Fix infinite recursion in group_members RLS policies

-- 1. Create a helper function to check group membership bypassing RLS
-- This breaks the recursion loop (group_members policy -> referencing group_members)
CREATE OR REPLACE FUNCTION public.fn_is_group_member(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- run as owner, bypassing RLS
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

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Members can view other members of same group" ON public.group_members;

-- 3. Recreate the policy using the security definer function and optimizing checks
CREATE POLICY "Members can view other members of same group"
  ON public.group_members FOR SELECT
  USING (
    -- Case 1: I can see my own membership
    user_id = auth.uid()
    OR 
    -- Case 2: I can see other members if I am a member of the same group
    public.fn_is_group_member(group_id, auth.uid())
  );
