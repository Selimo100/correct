-- Migration: UX Improvements
-- Date: 2026-02-06
-- Features: 
-- 1. Incoming Friend Request Count
-- 2. Public Profiles & User Bet Lists
-- 3. Group Members List
-- 4. Comment Counts in Feed
-- 5. Category Details in Bet Detail

-- =========================================================
-- 1. Incoming Friend Request Count
-- =========================================================
CREATE OR REPLACE FUNCTION fn_incoming_friend_request_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Only count pending requests sent TO the auth user
  SELECT count(*)::integer INTO v_count
  FROM public.friend_requests
  WHERE to_user_id = auth.uid()
    AND status = 'PENDING';
    
  RETURN v_count;
END;
$$;

-- =========================================================
-- 2. Public Profiles & User Bets
-- =========================================================

-- Public Profile Getter
CREATE OR REPLACE FUNCTION fn_get_public_profile(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_profile record;
  v_stats jsonb;
  v_balance numeric;
  v_created_count bigint;
  v_participated_count bigint;
  v_wins bigint;
  v_losses bigint;
BEGIN
  -- Get Profile
  SELECT id, username, first_name, last_name, created_at, avatar_url
  INTO v_user_profile
  FROM public.profiles
  WHERE username = p_username AND status = 'ACTIVE';

  IF v_user_profile IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get Ledger Balance (if public? assuming yes per requirement)
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.wallet_ledger
  WHERE user_id = v_user_profile.id;

  -- Stats
  SELECT count(*) INTO v_created_count FROM public.bets WHERE creator_id = v_user_profile.id;
  
  -- Participated
  SELECT count(distinct bet_id) INTO v_participated_count FROM public.bet_entries WHERE user_id = v_user_profile.id;
  
  -- Win Rate (approximate from ledger payouts)
  -- Count types: BET_PAYOUT only happens on win.
  -- This creates a simple proxy. (Or check bet_entries joined with bets resolution)
  -- Better: Check resolved bets where user side == resolution
  SELECT count(*) INTO v_wins
  FROM public.bet_entries be
  JOIN public.bets b ON be.bet_id = b.id
  WHERE be.user_id = v_user_profile.id
    AND b.status = 'RESOLVED'
    AND ((b.resolution = TRUE AND be.side = 'FOR') OR (b.resolution = FALSE AND be.side = 'AGAINST'));

  -- Simplify: Just return basic stats
  v_stats := jsonb_build_object(
    'bets_created', v_created_count,
    'bets_participated', v_participated_count,
    'wins', v_wins,
    'balance', v_balance
  );

  RETURN jsonb_build_object(
    'id', v_user_profile.id,
    'username', v_user_profile.username,
    'display_name', v_user_profile.first_name || ' ' || left(v_user_profile.last_name, 1) || '.',
    'created_at', v_user_profile.created_at,
    'avatar_url', v_user_profile.avatar_url,
    'stats', v_stats
  );
END;
$$;

-- List User Bets (Respecting visibility for the VIEWER)
CREATE OR REPLACE FUNCTION fn_list_user_bets(
  p_username text, 
  p_filter_status text DEFAULT 'ALL' -- OPEN, LOCKED, RESOLVED, VOID
)
RETURNS TABLE (
  id uuid,
  title text,
  status text,
  end_at timestamptz,
  created_at timestamptz,
  total_pot bigint,
  category_name text,
  comment_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_user_id uuid;
  v_viewer_id uuid := auth.uid();
BEGIN
  SELECT id INTO v_target_user_id FROM public.profiles WHERE username = p_username;
  
  IF v_target_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.status,
    b.end_at,
    b.created_at,
    COALESCE(bs.total_pot, 0) as total_pot,
    c.name as category_name,
    (SELECT count(*)::bigint FROM public.comments cm WHERE cm.bet_id = b.id) as comment_count
  FROM public.bets b
  LEFT JOIN public.categories c ON b.category_id = c.id
  LEFT JOIN public.bet_settlements bs ON b.id = bs.bet_id -- fallback for resolved stats? or use live aggregate?
  -- Actually let's use live aggregate for accuracy if not settled
  LEFT JOIN (
      SELECT bet_id, SUM(stake) as total_pot FROM public.bet_entries GROUP BY bet_id
  ) st ON b.id = st.bet_id
  WHERE b.creator_id = v_target_user_id
    AND (p_filter_status = 'ALL' OR b.status = p_filter_status)
    AND b.hidden = FALSE
    -- VISIBILITY CHECK (Simplified for list)
    AND (
      -- 1. I am admin
      EXISTS (SELECT 1 FROM public.profiles WHERE id = v_viewer_id AND is_admin = TRUE)
      OR
      -- 2. Public
      b.audience = 'PUBLIC'
      OR
      -- 3. I am the creator (viewing own profile)
      b.creator_id = v_viewer_id
      OR
      -- 4. Friends
      (b.audience = 'FRIENDS' AND EXISTS (SELECT 1 FROM public.friendships f WHERE (f.user_id = v_viewer_id AND f.friend_id = b.creator_id) OR (f.friend_id = v_viewer_id AND f.user_id = b.creator_id)))
      OR
      -- 5. Groups (I am in the group)
      (b.audience = 'GROUP' AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = b.group_id AND gm.user_id = v_viewer_id))
    )
  ORDER BY b.created_at DESC
  LIMIT 50;
END;
$$;

-- =========================================================
-- 3. Group Members
-- =========================================================

-- RLS Update: Allow members to see other members
-- Drop existing policy if it's too restrictive (e.g. "Owner only")
-- We assume "Select group_members" might be restricted.
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
CREATE POLICY "Group members can view other members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (
    -- You can see a row if you are in the same group
    EXISTS (
      SELECT 1 FROM public.group_members my_gm 
      WHERE my_gm.group_id = group_members.group_id 
      AND my_gm.user_id = auth.uid()
    )
    -- Or if you are looking at your own row? (Already covered above)
  );

-- Helper RPC
CREATE OR REPLACE FUNCTION fn_get_group_members(p_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  is_owner boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_viewer_id uuid := auth.uid();
  v_group_owner_id uuid;
BEGIN
  -- Check access
  IF NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = v_viewer_id) THEN
     RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT owner_id INTO v_group_owner_id FROM public.groups WHERE id = p_group_id;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.first_name || ' ' || left(p.last_name, 1) || '.',
    p.avatar_url,
    gm.joined_at,
    (p.id = v_group_owner_id) as is_owner
  FROM public.group_members gm
  JOIN public.profiles p ON gm.user_id = p.id
  WHERE gm.group_id = p_group_id
  ORDER BY gm.joined_at ASC;
END;
$$;


-- =========================================================
-- 4. Search Bets V2 (Add Comment Count)
-- =========================================================
-- Drop first to allow return type change
DROP FUNCTION IF EXISTS public.fn_search_bets_v2(text, uuid, text, text, integer, integer, text);

CREATE OR REPLACE FUNCTION public.fn_search_bets_v2(
  p_search_text TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'newest', 
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_audience_scope TEXT DEFAULT 'PUBLIC' 
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category_id UUID,
  category_name TEXT,
  category_icon TEXT,
  creator_id UUID,
  creator_username TEXT,
  creator_avatar_url TEXT,
  end_at TIMESTAMPTZ,
  status TEXT,
  resolution BOOLEAN,
  created_at TIMESTAMPTZ,
  audience TEXT,
  group_id UUID,
  group_name TEXT,
  total_pot BIGINT,
  participant_count BIGINT,
  for_stake BIGINT,
  against_stake BIGINT,
  comment_count BIGINT -- NEW
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH bet_stats AS (
    SELECT 
      be.bet_id,
      COALESCE(SUM(be.stake), 0) as total_pot,
      COUNT(DISTINCT be.user_id) as participant_count,
      COALESCE(SUM(be.stake) FILTER (WHERE be.side = 'FOR'), 0) as for_stake,
      COALESCE(SUM(be.stake) FILTER (WHERE be.side = 'AGAINST'), 0) as against_stake
    FROM bet_entries be
    GROUP BY be.bet_id
  )
  SELECT 
    b.id,
    b.title,
    b.description,
    b.category_id,
    c.name as category_name,
    c.icon as category_icon,
    b.creator_id,
    p.username as creator_username,
    NULL::text as creator_avatar_url,
    b.end_at,
    b.status,
    b.resolution,
    b.created_at,
    b.audience,
    b.group_id,
    g.name as group_name,
    COALESCE(bs.total_pot, 0) as total_pot,
    COALESCE(bs.participant_count, 0) as participant_count,
    COALESCE(bs.for_stake, 0) as for_stake,
    COALESCE(bs.against_stake, 0) as against_stake,
    (SELECT count(*) FROM public.comments cm WHERE cm.bet_id = b.id)::BIGINT as comment_count
  FROM bets b
  JOIN profiles p ON b.creator_id = p.id
  LEFT JOIN categories c ON b.category_id = c.id
  LEFT JOIN groups g ON b.group_id = g.id
  LEFT JOIN bet_stats bs ON b.id = bs.bet_id
  WHERE 
    b.hidden = FALSE
    AND (p_category_id IS NULL OR b.category_id = p_category_id)
    AND (p_status IS NULL OR b.status = p_status)
    AND (
      p_search_text IS NULL OR 
      p_search_text = '' OR
      b.fts @@ plainto_tsquery('english', p_search_text) OR
      p.username ILIKE '%' || p_search_text || '%'
    )
    AND (
       -- AUDIENCE LOGIC --
       CASE 
          WHEN p_audience_scope = 'PUBLIC' THEN 
             b.audience = 'PUBLIC'
             
          WHEN p_audience_scope = 'FRIENDS' THEN 
             (b.audience IN ('PUBLIC', 'FRIENDS') AND 
              EXISTS (
                SELECT 1 FROM friendships f 
                WHERE (f.user_id = v_user_id AND f.friend_id = b.creator_id)
                   OR (f.friend_id = v_user_id AND f.user_id = b.creator_id)
              ))
              
          WHEN p_audience_scope = 'GROUPS' THEN
             (b.audience = 'GROUP' AND 
              EXISTS (
                SELECT 1 FROM group_members gm 
                WHERE gm.group_id = b.group_id AND gm.user_id = v_user_id
              ))
              
          ELSE FALSE -- 'ALL' not fully implemented yet for security reasons without filters
       END
    )
  ORDER BY 
    CASE WHEN p_sort_by = 'ending_soon' THEN b.end_at END ASC,
    CASE WHEN p_sort_by = 'newest' THEN b.created_at END DESC,
    CASE WHEN p_sort_by = 'popular' THEN COALESCE(bs.total_pot, 0) END DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


-- =========================================================
-- 5. Bet Detail (Add Category Info)
-- =========================================================

CREATE OR REPLACE FUNCTION fn_get_bet_detail(p_bet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet jsonb;
  v_cat_info jsonb;
  v_user_id uuid;
  v_is_admin boolean;
  v_has_access boolean;
  v_hide_participants boolean;
  v_creator_id uuid;
  v_visibility text;
  v_audience text;
  v_group_id uuid;
  v_invite_code_enabled boolean;
  v_cat_name text;
  v_cat_icon text;
BEGIN
  v_user_id := auth.uid();
  
  -- Get bet data with category
  SELECT 
    to_jsonb(b.*), b.hide_participants, b.creator_id, b.visibility, b.audience, b.group_id, b.invite_code_enabled,
    c.name, c.icon,
    EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND (is_admin = TRUE OR is_super_admin = TRUE))
  INTO v_bet, v_hide_participants, v_creator_id, v_visibility, v_audience, v_group_id, v_invite_code_enabled, v_cat_name, v_cat_icon, v_is_admin
  FROM public.bets b
  LEFT JOIN public.categories c ON b.category_id = c.id
  WHERE b.id = p_bet_id;
  
  IF v_bet IS NULL THEN RETURN NULL; END IF;

  -- Add category info to bet json
  IF v_cat_name IS NOT NULL THEN
    v_bet := v_bet || jsonb_build_object(
        'category', jsonb_build_object('name', v_cat_name, 'icon', v_cat_icon)
    );
  END IF;

  -- Default Access: Creator and Admin always have access
  IF v_creator_id = v_user_id OR v_is_admin THEN
      v_has_access := TRUE;
  ELSE
      v_has_access := FALSE;
      -- Participant?
      IF EXISTS (SELECT 1 FROM public.bet_entries WHERE bet_id = p_bet_id AND user_id = v_user_id) THEN
          v_has_access := TRUE;
      ELSE
          -- Audience Logic
          CASE 
              WHEN v_audience = 'PUBLIC' THEN
                   v_has_access := TRUE;
              WHEN v_audience = 'FRIENDS' THEN
                   SELECT EXISTS (SELECT 1 FROM public.friendships f WHERE (f.user_id = v_user_id AND f.friend_id = v_creator_id) OR (f.friend_id = v_user_id AND f.user_id = v_creator_id)) INTO v_has_access;
              WHEN v_audience = 'GROUP' THEN
                   SELECT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = v_group_id AND gm.user_id = v_user_id) INTO v_has_access;
              WHEN v_audience = 'PRIVATE' THEN
                   SELECT EXISTS (SELECT 1 FROM public.bet_recipients br WHERE br.bet_id = p_bet_id AND br.user_id = v_user_id) INTO v_has_access;
              ELSE
                   v_has_access := FALSE;
          END CASE;
      END IF;
  END IF;

  IF NOT v_has_access THEN
     IF v_audience = 'PRIVATE' OR v_invite_code_enabled THEN
         RETURN jsonb_build_object('id', p_bet_id, 'visibility', 'PRIVATE', 'has_access', false, 'invite_code_enabled', v_invite_code_enabled);
     ELSE
         RETURN NULL;
     END IF;
  END IF;

  -- Return full object (same as before but using updated v_bet)
  -- Re-attach stats if needed, or caller handles it. The original code did more logic:
  -- ... Stats query ...
  -- For brevity in this fix, we assume the caller RPC logic can be preserved or we just return v_bet here?
  -- Wait, the previous version had complex stats logic. I should fully reconstruct it to avoid breaking it.
  -- Let's include the stats block.
  
  DECLARE
    v_stats jsonb;
    v_participants jsonb;
  BEGIN
      WITH stats AS (
         SELECT 
           count(distinct user_id) as participants_total, 
           COALESCE(sum(stake), 0) as total_pot,
           COALESCE(sum(stake) FILTER (WHERE side = 'FOR'), 0) as for_stake,
           COALESCE(sum(stake) FILTER (WHERE side = 'AGAINST'), 0) as against_stake
         FROM public.bet_entries WHERE bet_id = p_bet_id
      )
      SELECT to_jsonb(s.*) INTO v_stats FROM stats s;
    
      -- Participants list (anonymity check)
      IF v_hide_participants AND v_creator_id <> v_user_id AND NOT v_is_admin THEN
         v_participants := '[]'::jsonb;
      ELSE
         SELECT jsonb_agg(
           jsonb_build_object(
             'user_id', be.user_id,
             'username', p.username,
             'side', be.side,
             'stake', be.stake,
             'avatar_url', p.avatar_url,
             'created_at', be.created_at
           ) ORDER BY be.stake DESC
         ) INTO v_participants
         FROM public.bet_entries be
         JOIN public.profiles p ON be.user_id = p.id
         WHERE be.bet_id = p_bet_id;
      END IF;
      
      RETURN v_bet || jsonb_build_object(
        'stats', v_stats,
        'participants', COALESCE(v_participants, '[]'::jsonb),
        'has_access', true
      );
  END;
END;
$$;
