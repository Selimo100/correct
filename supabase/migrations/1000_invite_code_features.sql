-- MIGRATION: 1000_invite_code_features.sql
-- Adds encryption for invite codes and RPCs to retrieve them securely

-- 1. Enable pgcrypto if not already (it is likely enabled for 'crypt')
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add encrypted code column to bets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'invite_code_enc') THEN
        ALTER TABLE public.bets ADD COLUMN invite_code_enc text NULL;
    END IF;
END $$;

-- 3. Update fn_create_bet to store encrypted code
-- NOTE: We are adding p_secret argument to encrypt the code
DROP FUNCTION IF EXISTS fn_create_bet;

CREATE OR REPLACE FUNCTION fn_create_bet(
  p_title text,
  p_description text,
  p_category_id uuid,
  p_end_at timestamptz,
  p_max_participants int,
  p_visibility text,
  p_invite_code_enabled boolean,
  p_hide_participants boolean,
  p_secret text DEFAULT NULL -- New argument for encryption key
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bet_id uuid;
  v_invite_code text;
  v_invite_code_hash text;
  v_invite_code_enc text;
  v_creator_id uuid;
BEGIN
  v_creator_id := auth.uid();
  IF p_visibility NOT IN ('PUBLIC', 'PRIVATE') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;
  
  -- Generate Code if Private
  IF p_visibility = 'PRIVATE' AND p_invite_code_enabled THEN
    v_invite_code := substr(md5(random()::text), 1, 8); 
    v_invite_code_hash := crypt(v_invite_code, gen_salt('bf'));
    
    -- Encrypt the code if secret is provided
    IF p_secret IS NOT NULL THEN
       v_invite_code_enc := pgp_sym_encrypt(v_invite_code, p_secret);
    END IF;
  END IF;

  INSERT INTO public.bets (
    creator_id, title, description, category_id, end_at, max_participants, 
    visibility, invite_code_hash, invite_code_enc, invite_code_enabled, hide_participants,
    status
  ) VALUES (
    v_creator_id, p_title, p_description, p_category_id, p_end_at, p_max_participants,
    p_visibility, v_invite_code_hash, v_invite_code_enc, p_invite_code_enabled, p_hide_participants,
    'OPEN'
  ) RETURNING id INTO v_bet_id;
  
  -- Return ID and Plaintext code (for one-time display)
  RETURN jsonb_build_object('id', v_bet_id, 'invite_code', v_invite_code);
END;
$$;


-- 4. New RPC: fn_rotate_invite_code
-- Regenerates the code, updates hash AND enc
CREATE OR REPLACE FUNCTION fn_rotate_invite_code(
  p_bet_id uuid,
  p_secret text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_code text;
  v_visibility text;
  v_creator_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT visibility, creator_id INTO v_visibility, v_creator_id FROM public.bets WHERE id = p_bet_id;
  
  -- Auth Check
  SELECT (is_admin OR is_super_admin) INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF v_creator_id != auth.uid() AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF v_visibility != 'PRIVATE' THEN
     RAISE EXCEPTION 'Not a private bet';
  END IF;

  v_new_code := substr(md5(random()::text), 1, 8);
  
  UPDATE public.bets 
  SET 
    invite_code_hash = crypt(v_new_code, gen_salt('bf')),
    invite_code_enc = pgp_sym_encrypt(v_new_code, p_secret),
    updated_at = now()
  WHERE id = p_bet_id;
  
  RETURN v_new_code;
END;
$$;


-- 5. New RPC: fn_get_invite_code
-- Decrypts and returns the code
CREATE OR REPLACE FUNCTION fn_get_invite_code(
  p_bet_id uuid,
  p_secret text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_enc text;
  v_creator_id uuid;
  v_is_admin boolean;
BEGIN
  -- Get encryption data
  SELECT invite_code_enc, creator_id 
  INTO v_code_enc, v_creator_id 
  FROM public.bets WHERE id = p_bet_id;
  
  -- Auth Check (Creator or Admin only)
  SELECT (is_admin OR is_super_admin) INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF v_creator_id != auth.uid() AND (v_is_admin IS NULL OR NOT v_is_admin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF v_code_enc IS NULL THEN
     RETURN NULL; -- No encrypted code stored (old bets?)
  END IF;

  -- Decrypt
  RETURN pgp_sym_decrypt(v_code_enc::bytea, p_secret);
END;
$$;
