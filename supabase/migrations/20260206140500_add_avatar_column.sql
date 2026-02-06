-- Fix: Add missing avatar_url column to profiles AND Fix functions to handle it
-- Date: 2026-02-06
-- Description: This column is required for the new UX improvements (public profiles and bet details).
-- We also re-run the function definitions to ensure they are updated correctly (and to fix return type conflicts).

-- 0. Schema: Add Column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;


-- 1. Function Fix (Recreate Search V2 with DROP)
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
    p.avatar_url as creator_avatar_url,
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


-- 2. Function Fix (Recreate Bet Detail to ensure it compiles against the new column)
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
                   SELECT EXISTS (SELECT 1 FROM public.friendships f WHERE (f.user_id = v_user_id AND f.friend_id = v_creator_id) OR (f.friend_id = v_user_id AND f.user_id = b.creator_id)) INTO v_has_access;
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
