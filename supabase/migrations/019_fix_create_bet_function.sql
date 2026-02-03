-- Fix for create bet function
-- Ensures pgcrypto is enabled and handles potential duplicate keys gracefully

-- 1. Enable pgcrypto if not exists (Critical for crypt/gen_salt)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Update fn_create_bet_v2 to be more robust
CREATE OR REPLACE FUNCTION fn_create_bet_v2(
  p_title text,
  p_description text,
  p_category_id uuid,
  p_end_at timestamptz,
  p_max_participants int,
  p_audience text, -- PUBLIC, FRIENDS, GROUP, PRIVATE
  p_group_id uuid,
  p_invite_code_enabled boolean,
  p_hide_participants boolean,
  p_secret text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bet_id uuid;
  v_creator_id uuid;
  v_visibility text; -- Legacy mapping
  v_invite_code text;
  v_invite_code_hash text;
  v_invite_code_enc text;
BEGIN
  v_creator_id := auth.uid();
  
  -- Validation
  IF p_audience = 'GROUP' AND p_group_id IS NULL THEN
    RAISE EXCEPTION 'Group required for GROUP audience';
  END IF;
  
  IF p_audience = 'GROUP' THEN
    -- Check membership/ownership
    IF NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = v_creator_id) THEN
      RAISE EXCEPTION 'Not member of group';
    END IF;
  END IF;

  -- Legacy Visibility Mapping
  v_visibility := CASE WHEN p_audience = 'PRIVATE' THEN 'PRIVATE' ELSE 'PUBLIC' END;

  -- Invite Code Logic (only for Private or maybe others too if link shared?)
  -- Keeping original logic: only if enabled
  IF p_invite_code_enabled THEN
    v_invite_code := substr(md5(random()::text), 1, 8); 
    v_invite_code_hash := crypt(v_invite_code, gen_salt('bf'));
    IF p_secret IS NOT NULL THEN
       v_invite_code_enc := pgp_sym_encrypt(v_invite_code, p_secret);
    END IF;
  END IF;

  INSERT INTO public.bets (
    creator_id, title, description, category_id, end_at, max_participants, 
    visibility, audience, group_id,
    invite_code_hash, invite_code_enc, invite_code_enabled, hide_participants,
    status
  ) VALUES (
    v_creator_id, p_title, p_description, p_category_id, p_end_at, p_max_participants,
    v_visibility, p_audience, p_group_id,
    v_invite_code_hash, v_invite_code_enc, p_invite_code_enabled, p_hide_participants,
    'OPEN'
  ) RETURNING id INTO v_bet_id;
  
  -- SNAPSHOT RECIPIENTS
  IF p_audience = 'FRIENDS' THEN
    -- Add all friends (Use ON CONFLICT DO NOTHING to prevent crashes)
    INSERT INTO public.bet_recipients (bet_id, user_id)
    SELECT v_bet_id, friend_id FROM public.friendships WHERE user_id = v_creator_id
    ON CONFLICT DO NOTHING;
    
    -- Add creator (implicit, but good for consistent queries)
    INSERT INTO public.bet_recipients (bet_id, user_id) VALUES (v_bet_id, v_creator_id)
    ON CONFLICT DO NOTHING;
    
  ELSIF p_audience = 'GROUP' THEN
    -- Add all group members
    INSERT INTO public.bet_recipients (bet_id, user_id)
    SELECT v_bet_id, user_id FROM public.group_members WHERE group_id = p_group_id
    ON CONFLICT DO NOTHING;
    
  ELSIF p_audience = 'PRIVATE' THEN
     -- Standard private bet: creator + anyone who joins later via code
     INSERT INTO public.bet_recipients (bet_id, user_id) VALUES (v_bet_id, v_creator_id)
     ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN jsonb_build_object('id', v_bet_id, 'invite_code', v_invite_code);
END;
$$;
