-- COMBINED MIGRATION: Private Bets, Anonymity, and Search Privacy (FIXED)
-- Run this in your Supabase SQL Editor to ensure your database is up to date.

-- 1. Add columns to bets (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'visibility') THEN
        ALTER TABLE public.bets ADD COLUMN visibility text CHECK (visibility IN ('PUBLIC', 'PRIVATE')) DEFAULT 'PUBLIC';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'invite_code_hash') THEN
        ALTER TABLE public.bets ADD COLUMN invite_code_hash text NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'invite_code_enabled') THEN
        ALTER TABLE public.bets ADD COLUMN invite_code_enabled boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'hide_participants') THEN
        ALTER TABLE public.bets ADD COLUMN hide_participants boolean DEFAULT false;
    END IF;
END $$;

-- 2. Create bet_access table
CREATE TABLE IF NOT EXISTS public.bet_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid REFERENCES public.bets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(bet_id, user_id)
);

ALTER TABLE public.bet_access ENABLE ROW LEVEL SECURITY;

-- 3. RLS for bet_access
DROP POLICY IF EXISTS "Users can read their own access" ON public.bet_access;
CREATE POLICY "Users can read their own access" ON public.bet_access
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Creators and admins can read access for their bets" ON public.bet_access;
CREATE POLICY "Creators and admins can read access for their bets" ON public.bet_access
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bets 
    WHERE id = bet_access.bet_id 
    AND (creator_id = auth.uid() OR EXISTS (
       SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    ))
  )
);

-- 4. Helper Function to break RLS Recursion
CREATE OR REPLACE FUNCTION fn_has_bet_access(p_bet_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bet_access 
    WHERE bet_id = p_bet_id AND user_id = p_user_id
  );
END;
$$;

-- 5. Update RLS for bets (using Helper Function)
DROP POLICY IF EXISTS "bets_select_public_or_own" ON public.bets;
DROP POLICY IF EXISTS "bets_select_policy" ON public.bets;

CREATE POLICY "bets_select_policy"
  ON public.bets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
    OR (creator_id = auth.uid())
    OR (
       hidden = FALSE 
       AND (
          visibility = 'PUBLIC'
          OR (
             visibility = 'PRIVATE' 
             AND fn_has_bet_access(bets.id, auth.uid())
          )
       )
    )
  );

-- 6. Update RLS for bet_entries (Anonymity)
DROP POLICY IF EXISTS "bet_entries_select_policy" ON public.bet_entries; 
CREATE POLICY "bet_entries_select_policy"
  ON public.bet_entries
  FOR SELECT
  TO authenticated
  USING (
     EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
     OR (user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.bets WHERE id = bet_entries.bet_id AND creator_id = auth.uid())
     OR (
       EXISTS (
         SELECT 1 FROM public.bets
         WHERE id = bet_entries.bet_id
         AND hide_participants = FALSE
       )
     )
  );

-- 7. RPC: fn_create_bet
CREATE OR REPLACE FUNCTION fn_create_bet(
  p_title text,
  p_description text,
  p_category_id uuid,
  p_end_at timestamptz,
  p_max_participants int,
  p_visibility text,
  p_invite_code_enabled boolean,
  p_hide_participants boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bet_id uuid;
  v_invite_code text;
  v_invite_code_hash text;
  v_creator_id uuid;
BEGIN
  v_creator_id := auth.uid();
  IF p_visibility NOT IN ('PUBLIC', 'PRIVATE') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;
  IF p_visibility = 'PRIVATE' AND p_invite_code_enabled THEN
    v_invite_code := substr(md5(random()::text), 1, 8); 
    v_invite_code_hash := crypt(v_invite_code, gen_salt('bf'));
  END IF;

  INSERT INTO public.bets (
    creator_id, title, description, category_id, end_at, max_participants, 
    visibility, invite_code_hash, invite_code_enabled, hide_participants,
    status
  ) VALUES (
    v_creator_id, p_title, p_description, p_category_id, p_end_at, p_max_participants,
    p_visibility, v_invite_code_hash, p_invite_code_enabled, p_hide_participants,
    'OPEN'
  ) RETURNING id INTO v_bet_id;
  
  RETURN jsonb_build_object('id', v_bet_id, 'invite_code', v_invite_code);
END;
$$;

-- 8. RPC: fn_join_private_bet
CREATE OR REPLACE FUNCTION fn_join_private_bet(
  p_bet_id uuid,
  p_invite_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
  v_visibility text;
BEGIN
  SELECT invite_code_hash, visibility INTO v_hash, v_visibility
  FROM public.bets WHERE id = p_bet_id;
  
  IF v_visibility != 'PRIVATE' THEN RAISE EXCEPTION 'Not a private bet'; END IF;
  IF v_hash IS NULL THEN RAISE EXCEPTION 'No invite code configured'; END IF;
  
  IF public.crypt(p_invite_code, v_hash) = v_hash THEN
    INSERT INTO public.bet_access (bet_id, user_id)
    VALUES (p_bet_id, auth.uid())
    ON CONFLICT (bet_id, user_id) DO NOTHING;
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
END;
$$;

-- 9. RPC: fn_get_bet_detail (FIXED COLUMNS)
CREATE OR REPLACE FUNCTION fn_get_bet_detail(p_bet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bet jsonb;
  v_entries jsonb;
  v_user_id uuid;
  v_is_admin boolean;
  v_has_access boolean;
  v_hide_participants boolean;
  v_creator_id uuid;
  v_visibility text;
BEGIN
  v_user_id := auth.uid();
  
  -- Get bet data
  SELECT 
    to_jsonb(b.*), b.hide_participants, b.creator_id, b.visibility,
    EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND (is_admin = TRUE OR is_super_admin = TRUE))
  INTO v_bet, v_hide_participants, v_creator_id, v_visibility, v_is_admin
  FROM public.bets b
  WHERE b.id = p_bet_id;
  
  IF v_bet IS NULL THEN RETURN NULL; END IF;

  -- Access Check
  v_has_access := TRUE;
  IF v_visibility = 'PRIVATE' THEN
    IF v_creator_id != v_user_id AND NOT v_is_admin THEN
      SELECT EXISTS(SELECT 1 FROM public.bet_access WHERE bet_id = p_bet_id AND user_id = v_user_id) INTO v_has_access;
      IF NOT v_has_access THEN
         RETURN jsonb_build_object(
           'id', p_bet_id, 'visibility', 'PRIVATE', 'has_access', false, 'invite_code_enabled', (v_bet->>'invite_code_enabled')::boolean
         );
      END IF;
    END IF;
  END IF;

  -- Stats (Using Correct Columns: stake, side)
  WITH stats AS (
     SELECT 
       count(*) as participants_total, 
       coalesce(sum(stake), 0) as pot_total,
       count(*) FILTER (WHERE side = 'FOR') as count_yes, 
       count(*) FILTER (WHERE side = 'AGAINST') as count_no,
       coalesce(sum(stake) FILTER (WHERE side = 'FOR'), 0) as amount_yes, 
       coalesce(sum(stake) FILTER (WHERE side = 'AGAINST'), 0) as amount_no
     FROM public.bet_entries WHERE bet_id = p_bet_id
  )
  SELECT to_jsonb(s.*) INTO v_entries FROM stats s;

  -- Participants List
  IF v_hide_participants AND v_creator_id != v_user_id AND NOT v_is_admin THEN
     -- Show only current user's entry if hidden
     v_bet := jsonb_set(v_bet, '{participants}', COALESCE((
       SELECT jsonb_agg(jsonb_build_object(
         'id', e.id, 
         'user_id', e.user_id, 
         'vote', e.side, -- UI expects 'vote', DB has 'side'
         'amount', e.stake, -- UI expects 'amount', DB has 'stake'
         'created_at', e.created_at, 
         'username', p.username
       ))
       FROM public.bet_entries e JOIN public.profiles p ON p.id = e.user_id 
       WHERE e.bet_id = p_bet_id AND e.user_id = v_user_id
     ), '[]'::jsonb));
  ELSE
     -- Show all entries
     v_bet := jsonb_set(v_bet, '{participants}', COALESCE((
       SELECT jsonb_agg(jsonb_build_object(
         'id', e.id, 
         'user_id', e.user_id, 
         'vote', e.side, -- UI expects 'vote'
         'amount', e.stake, -- UI expects 'amount'
         'created_at', e.created_at, 
         'username', p.username
       ))
       FROM public.bet_entries e JOIN public.profiles p ON p.id = e.user_id 
       WHERE e.bet_id = p_bet_id
     ), '[]'::jsonb));
  END IF;
  
  v_bet := v_bet || v_entries;
  v_bet := jsonb_set(v_bet, '{has_access}', 'true'::jsonb);
  RETURN v_bet;
END;
$$;

-- 10. RPC: fn_search_bets (PRIVACY AWARE)
CREATE OR REPLACE FUNCTION public.fn_search_bets(
  p_search_text TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'newest',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, title TEXT, description TEXT, category_id UUID, category_name TEXT, category_icon TEXT,
  creator_id UUID, creator_username TEXT, end_at TIMESTAMPTZ, status TEXT, resolution BOOLEAN,
  created_at TIMESTAMPTZ, total_pot BIGINT, participant_count BIGINT, for_stake BIGINT, against_stake BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT (is_admin OR is_super_admin) INTO v_is_admin FROM profiles p WHERE p.id = v_user_id;
  END IF;
  v_is_admin := COALESCE(v_is_admin, false);

  RETURN QUERY
  WITH bet_stats AS (
    SELECT be.bet_id, COALESCE(SUM(be.stake), 0) as total_pot, COUNT(DISTINCT be.user_id) as participant_count,
      COALESCE(SUM(be.stake) FILTER (WHERE be.side = 'FOR'), 0) as for_stake,
      COALESCE(SUM(be.stake) FILTER (WHERE be.side = 'AGAINST'), 0) as against_stake
    FROM bet_entries be GROUP BY be.bet_id
  )
  SELECT 
    b.id, b.title, b.description, b.category_id, c.name, c.icon, b.creator_id, p.username,
    b.end_at, b.status, b.resolution, b.created_at,
    COALESCE(bs.total_pot, 0), COALESCE(bs.participant_count, 0), COALESCE(bs.for_stake, 0), COALESCE(bs.against_stake, 0)
  FROM bets b
  JOIN profiles p ON b.creator_id = p.id
  LEFT JOIN categories c ON b.category_id = c.id
  LEFT JOIN bet_stats bs ON b.id = bs.bet_id
  WHERE 
    b.hidden = FALSE 
    AND (
       b.visibility = 'PUBLIC'
       OR (v_user_id IS NOT NULL AND b.creator_id = v_user_id)
       OR v_is_admin
       OR (v_user_id IS NOT NULL AND fn_has_bet_access(b.id, v_user_id))
    )
    AND (p_category_id IS NULL OR b.category_id = p_category_id)
    AND (p_status IS NULL OR b.status = p_status)
    AND (
      p_search_text IS NULL OR p_search_text = '' OR
      b.fts @@ plainto_tsquery('english', p_search_text) OR p.username ILIKE '%' || p_search_text || '%'
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
