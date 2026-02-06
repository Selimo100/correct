-- Fix Recursion V3: The "Absolute" Fix
-- Uses System Catalog iteration to drop ALL policies and implements SECURITY DEFINER lookups.

-- 1. DROP ALL POLICIES (Dynamic Logic to catch everything)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on groups
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'groups' AND schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.groups';
  END LOOP;
  
  -- Drop all policies on group_members
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members' AND schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.group_members';
  END LOOP;
END $$;

-- 2. ENSURE DENORMALIZATION IS IN PLACE
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS member_ids uuid[] DEFAULT '{}';

-- Refresh cache (in case previous migration missed some)
UPDATE public.groups g
SET member_ids = ARRAY(
  SELECT user_id 
  FROM public.group_members gm 
  WHERE gm.group_id = g.id
);

-- 3. ENSURE CACHE TRIGGERS EXIST
CREATE OR REPLACE FUNCTION fn_maintain_group_members_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DECLARE
    v_group_id uuid;
  BEGIN
    IF (TG_OP = 'DELETE') THEN
      v_group_id := OLD.group_id;
    ELSE
      v_group_id := NEW.group_id;
    END IF;

    UPDATE public.groups
    SET member_ids = ARRAY(
      SELECT user_id 
      FROM public.group_members 
      WHERE group_id = v_group_id
    )
    WHERE id = v_group_id;
    
    RETURN NULL;
  END;
END;
$$;

DROP TRIGGER IF EXISTS tr_group_members_cache_insert ON public.group_members;
DROP TRIGGER IF EXISTS tr_group_members_cache_update ON public.group_members;
DROP TRIGGER IF EXISTS tr_group_members_cache_delete ON public.group_members;

CREATE TRIGGER tr_group_members_cache_insert AFTER INSERT ON public.group_members FOR EACH ROW EXECUTE FUNCTION fn_maintain_group_members_cache();
CREATE TRIGGER tr_group_members_cache_update AFTER UPDATE ON public.group_members FOR EACH ROW EXECUTE FUNCTION fn_maintain_group_members_cache();
CREATE TRIGGER tr_group_members_cache_delete AFTER DELETE ON public.group_members FOR EACH ROW EXECUTE FUNCTION fn_maintain_group_members_cache();

-- 4. CREATE SECURITY DEFINER LOOKUP (Bypasses RLS Loop completely)
CREATE OR REPLACE FUNCTION fn_group_access_cache_check(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reads table directly (System Level Access) to check permission
  -- Does NOT trigger RLS on 'groups'
  RETURN EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id
    AND (owner_id = p_user_id OR p_user_id = ANY(member_ids))
  );
END;
$$;

-- 5. APPLY FINAL POLICIES

-- Groups: Check own columns (O(1))
CREATE POLICY "groups_select_final"
ON public.groups
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR 
  auth.uid() = ANY(member_ids)
);

CREATE POLICY "groups_insert_final" ON public.groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "groups_update_final" ON public.groups FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "groups_delete_final" ON public.groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Members: Use Security Definer to peek at Group permissions
CREATE POLICY "group_members_select_final"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- I can see myself
  OR
  fn_group_access_cache_check(group_id, auth.uid()) -- I can see members if I have access to the group
);

-- Only owners can add/remove (check against groups owner_id directly via helper if needed, or simple EXISTS)
-- Using simple EXISTS on groups is safe IF groups policy is non-recursive. 
-- But let's use a restricted SD helper for modification too for max safety.

CREATE OR REPLACE FUNCTION fn_is_group_owner_sd(p_group_id uuid, p_user_id uuid) 
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND owner_id = p_user_id);
END;
$$;

CREATE POLICY "group_members_insert_final"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  fn_is_group_owner_sd(group_id, auth.uid())
);

CREATE POLICY "group_members_delete_final"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  fn_is_group_owner_sd(group_id, auth.uid())
);
