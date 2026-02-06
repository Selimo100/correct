-- Add Role Column to Group Members

-- 1. Add column
ALTER TABLE public.group_members 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'));

-- 2. Backfill Owner Roles
-- Ensure existing owners in group_members are marked as OWNER
UPDATE public.group_members gm
SET role = 'OWNER'
FROM public.groups g
WHERE gm.group_id = g.id AND gm.user_id = g.owner_id;

-- 3. Update Create Bundle to set Owner Role
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

  -- Auto-add owner as member with OWNER role
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, auth.uid(), 'OWNER');

  RETURN jsonb_build_object('id', v_group_id, 'name', p_name);
END;
$$;
