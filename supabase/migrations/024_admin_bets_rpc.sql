-- =====================================================
-- MIGRATION: 024_admin_bets_rpc.sql
-- PURPOSE: Provide robust RPCs for admin bet moderation
-- FIXED: Ambiguous id column reference by renaming output to bet_id
-- =====================================================

-- 0. Cleanup old versions to allow return type changes
DROP FUNCTION IF EXISTS fn_admin_list_bets(text, text, text, uuid, text, int, int);
DROP FUNCTION IF EXISTS fn_admin_bet_counts();

-- 1. Main Listing RPC
CREATE OR REPLACE FUNCTION fn_admin_list_bets(
  p_search TEXT DEFAULT NULL,
  p_hidden TEXT DEFAULT 'all',         -- 'all' | 'visible' | 'hidden'
  p_status TEXT DEFAULT 'all',         -- 'all' | 'open' | 'locked' | 'resolved' | 'void'
  p_category_id UUID DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest',        -- 'newest' | 'ending' | 'pot'
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  bet_id UUID,
  title TEXT,
  description TEXT,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  hidden BOOLEAN,
  status TEXT,
  derived_status TEXT,
  visibility TEXT,
  audience TEXT,
  creator_username TEXT,
  category_slug TEXT,
  category_name TEXT,
  pot BIGINT,
  participants BIGINT,
  for_total BIGINT,
  against_total BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_search_term TEXT;
BEGIN
  -- 1. Auth Check (Explicit alias to avoid ambiguity)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS admin_prof
    WHERE admin_prof.id = auth.uid() 
      AND admin_prof.status = 'ACTIVE' 
      AND (admin_prof.is_admin = TRUE OR admin_prof.is_super_admin = TRUE)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required';
  END IF;

  -- 2. Clean inputs
  IF p_search IS NOT NULL AND p_search != '' THEN
      v_search_term := '%' || p_search || '%';
  ELSE
      v_search_term := NULL;
  END IF;

  RETURN QUERY
  WITH bet_stats AS (
    SELECT 
      entries.bet_id,
      COUNT(DISTINCT entries.user_id) as p_count,
      COALESCE(SUM(entries.stake), 0) as total_stake,
      COALESCE(SUM(CASE WHEN entries.side = 'FOR' THEN entries.stake ELSE 0 END), 0) as for_stake,
      COALESCE(SUM(CASE WHEN entries.side = 'AGAINST' THEN entries.stake ELSE 0 END), 0) as against_stake
    FROM public.bet_entries AS entries
    GROUP BY entries.bet_id
  )
  SELECT 
    b.id AS bet_id,
    b.title,
    b.description,
    b.end_at,
    b.created_at,
    b.hidden,
    b.status,
    CASE 
      WHEN b.status = 'OPEN' AND b.end_at < NOW() THEN 'LOCKED'
      ELSE b.status 
    END AS derived_status,
    b.visibility,
    b.audience,
    creators.username AS creator_username,
    cats.slug AS category_slug,
    cats.name AS category_name,
    COALESCE(stats.total_stake, 0)::BIGINT AS pot,
    COALESCE(stats.p_count, 0)::BIGINT AS participants,
    COALESCE(stats.for_stake, 0)::BIGINT AS for_total,
    COALESCE(stats.against_stake, 0)::BIGINT AS against_total
  FROM public.bets AS b
  LEFT JOIN public.profiles AS creators ON b.creator_id = creators.id
  LEFT JOIN public.categories AS cats ON b.category_id = cats.id
  LEFT JOIN bet_stats AS stats ON b.id = stats.bet_id
  WHERE 
    -- Hidden filter
    (p_hidden = 'all' OR (p_hidden = 'visible' AND b.hidden = FALSE) OR (p_hidden = 'hidden' AND b.hidden = TRUE))
    AND
    -- Status filter (Derived)
    (p_status = 'all' OR 
      (p_status = 'open' AND b.status = 'OPEN' AND b.end_at >= NOW()) OR
      (p_status = 'locked' AND b.status = 'OPEN' AND b.end_at < NOW()) OR
      (p_status = 'resolved' AND b.status = 'RESOLVED') OR
      (p_status = 'void' AND b.status = 'VOID')
    )
    AND
    -- Category filter
    (p_category_id IS NULL OR b.category_id = p_category_id)
    AND
    -- Search filter
    (v_search_term IS NULL OR 
      b.title ILIKE v_search_term OR
      b.description ILIKE v_search_term OR
      creators.username ILIKE v_search_term OR
      cats.name ILIKE v_search_term
    )
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN b.created_at END DESC,
    CASE WHEN p_sort = 'ending' THEN b.end_at END ASC,
    CASE WHEN p_sort = 'pot' THEN COALESCE(stats.total_stake, 0) END DESC,
    -- Secondary sort to ensure stability
    b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- 2. Counts RPC
CREATE OR REPLACE FUNCTION fn_admin_bet_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_total INT;
  v_visible INT;
  v_hidden INT;
  v_open INT;
  v_locked INT;
  v_resolved INT;
  v_void INT;
BEGIN
    -- 1. Auth Check (Explicit alias)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS admin_prof
    WHERE admin_prof.id = auth.uid() 
      AND admin_prof.status = 'ACTIVE' 
      AND (admin_prof.is_admin = TRUE OR admin_prof.is_super_admin = TRUE)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required';
  END IF;

  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE hidden = FALSE),
    COUNT(*) FILTER (WHERE hidden = TRUE),
    COUNT(*) FILTER (WHERE status = 'OPEN' AND end_at >= NOW()),
    COUNT(*) FILTER (WHERE status = 'OPEN' AND end_at < NOW()),
    COUNT(*) FILTER (WHERE status = 'RESOLVED'),
    COUNT(*) FILTER (WHERE status = 'VOID')
  INTO 
    v_total, v_visible, v_hidden, v_open, v_locked, v_resolved, v_void
  FROM public.bets;

  RETURN jsonb_build_object(
    'total', v_total,
    'visible', v_visible,
    'hidden', v_hidden,
    'open', v_open,
    'locked', v_locked,
    'resolved', v_resolved,
    'void', v_void
  );
END;
$$;

-- 3. Permissions
GRANT EXECUTE ON FUNCTION fn_admin_list_bets TO authenticated;
GRANT EXECUTE ON FUNCTION fn_admin_bet_counts TO authenticated;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bets_for_admin_list ON public.bets (created_at DESC, hidden, status, category_id);
