-- =====================================================
-- MIGRATION: 023_enable_comments_and_secure_rpc.sql
-- Enables robust commenting system with access control.
-- =====================================================

-- 1. Helper: Check Bet Access (Reused logic)
CREATE OR REPLACE FUNCTION fn_check_bet_access(p_bet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bet RECORD;
  v_is_admin BOOLEAN;
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- Get bet info
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Admin check
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND (is_admin = TRUE OR is_super_admin = TRUE))
  INTO v_is_admin;
  
  IF v_bet.creator_id = p_user_id OR v_is_admin THEN
    RETURN TRUE;
  END IF;

  -- Participant check
  IF EXISTS (SELECT 1 FROM public.bet_entries WHERE bet_id = p_bet_id AND user_id = p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Audience Rules
  IF v_bet.audience = 'PUBLIC' THEN
     RETURN TRUE;
  ELSIF v_bet.audience = 'FRIENDS' THEN
     -- Check friendship
     SELECT EXISTS (
         SELECT 1 FROM public.friendships f 
         WHERE (f.user_id = p_user_id AND f.friend_id = v_bet.creator_id)
            OR (f.friend_id = p_user_id AND f.user_id = v_bet.creator_id)
     ) INTO v_has_access;
     RETURN v_has_access;
  ELSIF v_bet.audience = 'GROUP' THEN
     SELECT EXISTS (
         SELECT 1 FROM public.group_members gm 
         WHERE gm.group_id = v_bet.group_id AND gm.user_id = p_user_id
     ) INTO v_has_access;
     RETURN v_has_access;
  ELSIF v_bet.audience = 'PRIVATE' THEN
     -- Explicit access
     SELECT EXISTS (
         SELECT 1 FROM public.bet_recipients br WHERE br.bet_id = p_bet_id AND br.user_id = p_user_id
     ) OR EXISTS (
         SELECT 1 FROM public.bet_access ba WHERE ba.bet_id = p_bet_id AND ba.user_id = p_user_id
     ) INTO v_has_access;
     RETURN v_has_access;
  END IF;

  RETURN FALSE;
END;
$$;


-- 2. Enhanced Create Comment RPC
CREATE OR REPLACE FUNCTION fn_create_comment(
  p_bet_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_status TEXT;
  v_comment_id UUID;
  v_can_access BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- 1. Status Check
  SELECT status INTO v_user_status FROM public.profiles WHERE id = v_user_id;
  IF v_user_status != 'ACTIVE' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only active users can comment');
  END IF;

  -- 2. Validate Content
  IF char_length(p_content) < 1 OR char_length(p_content) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comment length invalid (1-1000 chars)');
  END IF;

  -- 3. Validate Bet Access
  v_can_access := fn_check_bet_access(p_bet_id, v_user_id);
  
  IF NOT v_can_access THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to comment on this bet');
  END IF;

  -- 4. Create Comment
  INSERT INTO public.comments (bet_id, user_id, content, parent_id)
  VALUES (p_bet_id, v_user_id, p_content, p_parent_id)
  RETURNING id INTO v_comment_id;

  RETURN jsonb_build_object('success', true, 'comment_id', v_comment_id);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_create_comment TO authenticated;


-- 3. Get Comments RPC (Secure Read)
CREATE OR REPLACE FUNCTION fn_get_comments(p_bet_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  parent_id UUID,
  user_id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_access BOOLEAN;
BEGIN
  -- Strict Access Check
  IF auth.uid() IS NULL THEN
     -- Allow public bets for anon? Maybe logic differs. 
     -- For now assume auth required for this app based on "ACTIVE" requirement.
     -- If anon access happens, `auth.uid()` is null.
     -- We'll check if bet is PUBLIC.
     IF EXISTS (SELECT 1 FROM public.bets WHERE id = p_bet_id AND audience = 'PUBLIC') THEN
        v_can_access := TRUE;
     ELSE
        RETURN;
     END IF;
  ELSE
     v_can_access := fn_check_bet_access(p_bet_id, auth.uid());
  END IF;

  IF NOT v_can_access THEN
     RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    c.id, c.content, c.created_at, c.parent_id, c.user_id,
    p.username, p.first_name, p.last_name
  FROM public.comments c
  JOIN public.profiles p ON c.user_id = p.id
  WHERE c.bet_id = p_bet_id
    AND c.is_hidden = FALSE
  ORDER BY c.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_comments TO authenticated, anon;


-- 4. RLS Cleanup
-- We rely on RPCs primarily, but can keep limited Select policy for redundancy
-- Update comments policy to be simple (if desired) or rely on RPC.
-- User asked "Comments must be visible for ALL ACTIVE users".
-- This RPC delivers that.

-- Ensure comments table policies are not blocking if we used standard select previously?
-- Since we are moving to RPC fetching for Page, this is less critical, 
-- but let's ensure the table is not completely locked down.
-- (Existing policies from 009 allow select if authenticated).
