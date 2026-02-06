-- Fix Groups RLS Recursion using Denormalization (Best Practice)
-- Instead of recursive joins, we store member IDs in a column on the groups table.

-- 1. Add Cache Column
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS member_ids uuid[] DEFAULT '{}';

-- 2. Backfill Logic (Initial population)
-- Update every group with its members
UPDATE public.groups g
SET member_ids = ARRAY(
  SELECT user_id 
  FROM public.group_members gm 
  WHERE gm.group_id = g.id
);

-- 3. Create Trigger Function to Maintain Cache
CREATE OR REPLACE FUNCTION fn_maintain_group_members_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Determine Group ID
  DECLARE
    v_group_id uuid;
  BEGIN
    IF (TG_OP = 'DELETE') THEN
      v_group_id := OLD.group_id;
    ELSE
      v_group_id := NEW.group_id;
    END IF;

    -- Update the cache for this group
    UPDATE public.groups
    SET member_ids = ARRAY(
      SELECT user_id 
      FROM public.group_members 
      WHERE group_id = v_group_id
    )
    WHERE id = v_group_id;
    
    RETURN NULL; -- Trigger is AFTER, return value ignored
  END;
END;
$$;

-- 4. Attach Triggers
DROP TRIGGER IF EXISTS tr_group_members_cache_insert ON public.group_members;
DROP TRIGGER IF EXISTS tr_group_members_cache_update ON public.group_members;
DROP TRIGGER IF EXISTS tr_group_members_cache_delete ON public.group_members;

CREATE TRIGGER tr_group_members_cache_insert
AFTER INSERT ON public.group_members
FOR EACH ROW EXECUTE FUNCTION fn_maintain_group_members_cache();

CREATE TRIGGER tr_group_members_cache_update
AFTER UPDATE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION fn_maintain_group_members_cache();

CREATE TRIGGER tr_group_members_cache_delete
AFTER DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION fn_maintain_group_members_cache();

-- 5. SIMPLIFY RLS POLICIES (No more recursion!)

-- Drop old complex policies
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;

-- New Groups Policy: O(1) lookup
CREATE POLICY "groups_select_policy_v2"
ON public.groups
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR 
  auth.uid() = ANY(member_ids)
);

-- New Members Policy: Simple join to Groups (which is now O(1))
CREATE POLICY "group_members_select_policy_v2"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
      -- If I am owner OR I am in the members list
      AND (g.owner_id = auth.uid() OR auth.uid() = ANY(g.member_ids))
  )
);

-- 6. Grant Permissions (just in case)
GRANT SELECT ON public.groups TO authenticated;
GRANT SELECT ON public.group_members TO authenticated;
