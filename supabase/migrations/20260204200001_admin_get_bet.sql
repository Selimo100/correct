-- Admin get bet detail: fn_admin_get_bet
CREATE OR REPLACE FUNCTION public.fn_admin_get_bet(p_bet_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  creator_id UUID,
  creator_name TEXT,
  creator_username TEXT,
  category TEXT,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  status TEXT,
  derived_status TEXT,
  hidden BOOLEAN,
  resolution BOOLEAN,
  participants_count BIGINT,
  total_pot BIGINT,
  for_stake BIGINT,
  against_stake BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.fn_is_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH bet_stats AS (
    SELECT 
      be.bet_id, 
      COUNT(DISTINCT be.user_id) as p_count, 
      COALESCE(SUM(be.stake), 0) as t_pot,
      COALESCE(SUM(CASE WHEN be.side = 'FOR' THEN be.stake ELSE 0 END), 0) as f_stake,
      COALESCE(SUM(CASE WHEN be.side = 'AGAINST' THEN be.stake ELSE 0 END), 0) as a_stake
    FROM public.bet_entries be
    WHERE be.bet_id = p_bet_id
    GROUP BY be.bet_id
  )
  SELECT 
    b.id,
    b.title,
    b.description,
    b.creator_id,
    p.first_name || ' ' || p.last_name as creator_name,
    p.username as creator_username,
    b.category,
    b.end_at,
    b.created_at,
    b.status,
    CASE 
      WHEN b.status = 'OPEN' AND b.end_at < NOW() THEN 'LOCKED'
      ELSE b.status
    END as derived_status,
    b.hidden,
    b.resolution,
    COALESCE(bs.p_count, 0) as participants_count,
    COALESCE(bs.t_pot, 0) as total_pot,
    COALESCE(bs.f_stake, 0) as for_stake,
    COALESCE(bs.a_stake, 0) as against_stake
  FROM public.bets b
  LEFT JOIN public.profiles p ON b.creator_id = p.id
  LEFT JOIN bet_stats bs ON b.id = bs.bet_id
  WHERE b.id = p_bet_id;
END;
$$;
