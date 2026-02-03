-- MIGRATION: 014_friends_and_groups_rpcs.sql

-- 1. Search Users (Privacy Aware)
CREATE OR REPLACE FUNCTION fn_search_users(
  p_query text,
  p_exclude_friends boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.first_name, p.last_name, NULL::text as avatar_url -- Placeholder for avatar
  FROM public.profiles p
  WHERE 
    p.id <> auth.uid()
    AND p.status = 'ACTIVE'
    AND (p.username ILIKE '%' || p_query || '%' OR p.first_name || ' ' || p.last_name ILIKE '%' || p_query || '%')
    -- Exclude if YOU blocked THEM
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.id)
    -- Exclude if THEY blocked YOU
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.id AND b.blocked_id = auth.uid())
    -- Exclude if current friend (optional)
    AND (
       NOT p_exclude_friends 
       OR NOT EXISTS (SELECT 1 FROM public.friendships f WHERE f.user_id = auth.uid() AND f.friend_id = p.id)
    )
  LIMIT 20;
END;
$$;

-- 2. Send Friend Request
CREATE OR REPLACE FUNCTION fn_send_friend_request(p_to_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id uuid;
  v_status text;
  v_count int;
BEGIN
  SELECT id INTO v_recipient_id FROM public.profiles WHERE username = p_to_username AND status = 'ACTIVE';
  
  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'User not found or disabled';
  END IF;

  IF v_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot friend yourself';
  END IF;

  -- Block check
  IF EXISTS (SELECT 1 FROM public.blocks WHERE (blocker_id = auth.uid() AND blocked_id = v_recipient_id) OR (blocker_id = v_recipient_id AND blocked_id = auth.uid())) THEN
    RAISE EXCEPTION 'Cannot request this user';
  END IF;

  -- Existing friendship check
  IF EXISTS (SELECT 1 FROM public.friendships WHERE user_id = auth.uid() AND friend_id = v_recipient_id) THEN
    RAISE EXCEPTION 'Already friends';
  END IF;

  -- Check existing request
  SELECT status INTO v_status FROM public.friend_requests 
  WHERE (from_user_id = auth.uid() AND to_user_id = v_recipient_id)
     OR (from_user_id = v_recipient_id AND to_user_id = auth.uid())
  ORDER BY created_at DESC LIMIT 1;

  IF v_status = 'PENDING' THEN
     RETURN 'Request already pending';
  END IF;

  -- Rate Limit (20/day)
  SELECT COUNT(*) INTO v_count FROM public.friend_requests 
  WHERE from_user_id = auth.uid() AND created_at > now() - interval '24 hours';
  
  IF v_count >= 20 THEN
     RAISE EXCEPTION 'Daily limit reached';
  END IF;

  -- Insert
  INSERT INTO public.friend_requests (from_user_id, to_user_id, status)
  VALUES (auth.uid(), v_recipient_id, 'PENDING');

  RETURN 'Request sent';
END;
$$;

-- 3. Respond to Request
CREATE OR REPLACE FUNCTION fn_respond_friend_request(p_request_id uuid, p_accept boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reqRecord record;
BEGIN
  SELECT * INTO v_reqRecord FROM public.friend_requests WHERE id = p_request_id;
  
  IF v_reqRecord IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_reqRecord.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_reqRecord.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Request not pending';
  END IF;

  IF p_accept THEN
    UPDATE public.friend_requests SET status = 'ACCEPTED', responded_at = now() WHERE id = p_request_id;
    -- Create bi-directional friendship
    INSERT INTO public.friendships (user_id, friend_id) VALUES (v_reqRecord.from_user_id, v_reqRecord.to_user_id);
    INSERT INTO public.friendships (user_id, friend_id) VALUES (v_reqRecord.to_user_id, v_reqRecord.from_user_id);
    RETURN 'Accepted';
  ELSE
    UPDATE public.friend_requests SET status = 'DECLINED', responded_at = now() WHERE id = p_request_id;
    RETURN 'Declined';
  END IF;
END;
$$;

-- 4. Create Group
CREATE OR REPLACE FUNCTION fn_create_group(p_name text, p_description text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  INSERT INTO public.groups (owner_id, name, description)
  VALUES (auth.uid(), p_name, p_description)
  RETURNING id INTO v_group_id;
  
  -- Owner is implicitly a member (or not? UI might want clear "members" list). 
  -- Let's make owner a member to simplify "my groups" queries involving recipients
  INSERT INTO public.group_members (group_id, user_id) VALUES (v_group_id, auth.uid());
  
  RETURN v_group_id;
END;
$$;

-- 5. Add Group Member
CREATE OR REPLACE FUNCTION fn_add_group_member(p_group_id uuid, p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_friend_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.groups WHERE id = p_group_id;
  
  IF v_owner_id <> auth.uid() THEN
     RAISE EXCEPTION 'Not owner';
  END IF;
  
  SELECT id INTO v_friend_id FROM public.profiles WHERE username = p_username;
  
  IF v_friend_id IS NULL THEN
     RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Must be a friend (or self)
  IF v_friend_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM public.friendships WHERE user_id = auth.uid() AND friend_id = v_friend_id) THEN
     RAISE EXCEPTION 'Must be friend to add to group';
  END IF;
  
  BEGIN
    INSERT INTO public.group_members (group_id, user_id) VALUES (p_group_id, v_friend_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'Already member';
  END;
  
  RETURN 'Added';
END;
$$;

-- 6. Create Bet with Audience (Snapshot Logic)
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
    -- Add all friends
    INSERT INTO public.bet_recipients (bet_id, user_id)
    SELECT v_bet_id, friend_id FROM public.friendships WHERE user_id = v_creator_id;
    -- Add creator (implicit, but good for consistent queries)
    INSERT INTO public.bet_recipients (bet_id, user_id) VALUES (v_bet_id, v_creator_id);
    
  ELSIF p_audience = 'GROUP' THEN
    -- Add all group members
    INSERT INTO public.bet_recipients (bet_id, user_id)
    SELECT v_bet_id, user_id FROM public.group_members WHERE group_id = p_group_id;
    
  ELSIF p_audience = 'PRIVATE' THEN
     -- Standard private bet: creator + anyone who joins later via code
     INSERT INTO public.bet_recipients (bet_id, user_id) VALUES (v_bet_id, v_creator_id);
  END IF;
  
  RETURN jsonb_build_object('id', v_bet_id, 'invite_code', v_invite_code);
END;
$$;
