-- =====================================================
-- SEARCH & FILTERS - FTS and Advanced Querying
-- =====================================================

-- 1. Add Full Text Search Column
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS fts tsvector 
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') || 
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- Index for FTS
CREATE INDEX IF NOT EXISTS idx_bets_fts ON public.bets USING GIN (fts);

-- Additional Indexes for Filtering/Sorting
CREATE INDEX IF NOT EXISTS idx_bets_end_at ON public.bets(end_at);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at);
CREATE INDEX IF NOT EXISTS idx_bets_hidden ON public.bets(hidden);

-- =====================================================
-- FUNCTION: Search Bets
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_search_bets(
  p_search_text TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'newest', -- 'newest', 'ending_soon', 'popular', 'pot'
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
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
  end_at TIMESTAMPTZ,
  status TEXT,
  resolution BOOLEAN,
  created_at TIMESTAMPTZ,
  total_pot BIGINT,
  participant_count BIGINT,
  for_stake BIGINT,
  against_stake BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    b.end_at,
    b.status,
    b.resolution,
    b.created_at,
    COALESCE(bs.total_pot, 0) as total_pot,
    COALESCE(bs.participant_count, 0) as participant_count,
    COALESCE(bs.for_stake, 0) as for_stake,
    COALESCE(bs.against_stake, 0) as against_stake
  FROM bets b
  JOIN profiles p ON b.creator_id = p.id
  LEFT JOIN categories c ON b.category_id = c.id
  LEFT JOIN bet_stats bs ON b.id = bs.bet_id
  WHERE 
    b.hidden = FALSE -- basic visibility rule
    AND (p_category_id IS NULL OR b.category_id = p_category_id)
    AND (p_status IS NULL OR b.status = p_status)
    AND (
      p_search_text IS NULL OR 
      p_search_text = '' OR
      b.fts @@ plainto_tsquery('english', p_search_text) OR
      p.username ILIKE '%' || p_search_text || '%'
    )
  ORDER BY
    CASE WHEN p_sort_by = 'newest' THEN b.created_at END DESC,
    CASE WHEN p_sort_by = 'ending_soon' THEN b.end_at END ASC,
    CASE WHEN p_sort_by = 'popular' THEN COALESCE(bs.participant_count, 0) END DESC,
    CASE WHEN p_sort_by = 'pot' THEN COALESCE(bs.total_pot, 0) END DESC,
    b.id -- tiebreaker
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_search_bets TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_search_bets TO anon;
