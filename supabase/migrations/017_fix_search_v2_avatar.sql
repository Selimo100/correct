-- Migration 017: Fix Search Bets V2 (Remove missing avatar_url)

CREATE OR REPLACE FUNCTION public.fn_search_bets_v2(
  p_search_text TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'newest', -- 'newest', 'ending_soon', 'popular', 'pot'
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_audience_scope TEXT DEFAULT 'PUBLIC' -- 'PUBLIC', 'FRIENDS', 'GROUPS', 'ALL'
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
  against_stake BIGINT
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
    NULL::text as creator_avatar_url, -- FIXED: Column does not exist in profiles yet
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
    COALESCE(bs.against_stake, 0) as against_stake
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
              
          WHEN p_audience_scope = 'ALL' THEN
             (b.audience = 'PUBLIC' OR b.creator_id = v_user_id) -- Fallback
             
          ELSE FALSE 
       END
    )
  ORDER BY
    CASE WHEN p_sort_by = 'newest' THEN b.created_at END DESC,
    CASE WHEN p_sort_by = 'ending_soon' THEN b.end_at END ASC,
    CASE WHEN p_sort_by = 'popular' THEN bs.participant_count END DESC,
    CASE WHEN p_sort_by = 'pot' THEN bs.total_pot END DESC
  LIMIT p_limit 
  OFFSET p_offset;
END;
$$;
