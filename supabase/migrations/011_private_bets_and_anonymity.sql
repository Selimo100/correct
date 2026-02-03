-- Feature 1: Private Bets & Feature 2: Anonymity
-- 1. Add columns to bets
ALTER TABLE public.bets
ADD COLUMN visibility text CHECK (visibility IN ('PUBLIC', 'PRIVATE')) DEFAULT 'PUBLIC',
ADD COLUMN invite_code_hash text NULL,
ADD COLUMN invite_code_enabled boolean DEFAULT true,
ADD COLUMN hide_participants boolean DEFAULT false;

-- 2. Create bet_access table
CREATE TABLE public.bet_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid REFERENCES public.bets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(bet_id, user_id)
);

ALTER TABLE public.bet_access ENABLE ROW LEVEL SECURITY;

-- 3. RLS for bet_access
CREATE POLICY "Users can read their own access" ON public.bet_access
FOR SELECT TO authenticated
USING (user_id = auth.uid());

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

-- 4. Update RLS for bets
DROP POLICY "bets_select_public_or_own" ON public.bets;

CREATE POLICY "bets_select_policy"
  ON public.bets
  FOR SELECT
  TO authenticated
  USING (
    -- Admins/SuperAdmins see everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
    OR
    (
       -- Creator sees own
       creator_id = auth.uid()
    )
    OR
    (
       -- Must not be hidden by mod (existing logic)
       hidden = FALSE 
       AND
       (
          -- PUBLIC bets
          visibility = 'PUBLIC'
          OR
          -- PRIVATE bets: must have access
          (visibility = 'PRIVATE' AND EXISTS (
             SELECT 1 FROM public.bet_access WHERE bet_id = bets.id AND user_id = auth.uid()
          ))
       )
    )
  );

-- 5. Update RLS for bet_entries (Anonymity)
DROP POLICY IF EXISTS "bet_entries_select_policy" ON public.bet_entries; 

CREATE POLICY "bet_entries_select_policy"
  ON public.bet_entries
  FOR SELECT
  TO authenticated
  USING (
     -- Admin/Creator or User is Self
     EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
     OR
     (user_id = auth.uid())
     OR
     -- Creator of the bet
     EXISTS (SELECT 1 FROM public.bets WHERE id = bet_entries.bet_id AND creator_id = auth.uid())
     OR
     -- Publicly visible participants
     (
       EXISTS (
         SELECT 1 FROM public.bets
         WHERE id = bet_entries.bet_id
         AND hide_participants = FALSE
       )
     )
  );

-- 6. RPC: fn_create_bet
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
  
  -- Validation
  IF p_visibility NOT IN ('PUBLIC', 'PRIVATE') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;

  -- Generate invite code if needed
  IF p_visibility = 'PRIVATE' AND p_invite_code_enabled THEN
    -- simple 8 char alphanumeric
    v_invite_code := substr(md5(random()::text), 1, 8); 
    -- Using pgcrypto for hashing
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
  
  RETURN jsonb_build_object(
    'id', v_bet_id,
    'invite_code', v_invite_code
  );
END;
$$;

-- 7. RPC: fn_join_private_bet
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
  v_status text;
BEGIN
  SELECT invite_code_hash, visibility, status INTO v_hash, v_visibility, v_status
  FROM public.bets WHERE id = p_bet_id;
  
  IF v_visibility != 'PRIVATE' THEN
     RAISE EXCEPTION 'Not a private bet';
  END IF;

  IF v_hash IS NULL THEN
     RAISE EXCEPTION 'No invite code configured';
  END IF;
  
  -- Verify Invite Code
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

-- 8. RPC: fn_get_bet_detail
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
  
  -- Basic Info
  SELECT 
    to_jsonb(b.*), 
    b.hide_participants, 
    b.creator_id, 
    b.visibility,
    EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND (is_admin = TRUE OR is_super_admin = TRUE))
  INTO v_bet, v_hide_participants, v_creator_id, v_visibility, v_is_admin
  FROM public.bets b
  WHERE b.id = p_bet_id;
  
  IF v_bet IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check Access
  v_has_access := TRUE;
  IF v_visibility = 'PRIVATE' THEN
    IF v_creator_id != v_user_id AND NOT v_is_admin THEN
      SELECT EXISTS(SELECT 1 FROM public.bet_access WHERE bet_id = p_bet_id AND user_id = v_user_id) INTO v_has_access;
      IF NOT v_has_access THEN
         RETURN jsonb_build_object(
           'id', p_bet_id,
           'visibility', 'PRIVATE',
           'has_access', false,
           'invite_code_enabled', (v_bet->>'invite_code_enabled')::boolean
         );
      END IF;
    END IF;
  END IF;

  -- Calculate Aggregates
  WITH stats AS (
     SELECT 
       count(*) as participants_total,
       coalesce(sum(amount), 0) as pot_total,
       count(*) FILTER (WHERE vote = 'YES') as count_yes,
       count(*) FILTER (WHERE vote = 'NO') as count_no,
       coalesce(sum(amount) FILTER (WHERE vote = 'YES'), 0) as amount_yes,
       coalesce(sum(amount) FILTER (WHERE vote = 'NO'), 0) as amount_no
     FROM public.bet_entries
     WHERE bet_id = p_bet_id
  )
  SELECT to_jsonb(s.*) INTO v_entries FROM stats s;

  -- Get Participants List
  IF v_hide_participants AND v_creator_id != v_user_id AND NOT v_is_admin THEN
     -- Only show self
     v_bet := jsonb_set(v_bet, '{participants}', COALESCE((
       SELECT jsonb_agg(
         jsonb_build_object(
            'id', e.id,
            'user_id', e.user_id,
            'vote', e.vote,
            'amount', e.amount,
            'created_at', e.created_at,
            'username', p.username
         )
       )
       FROM public.bet_entries e
       JOIN public.profiles p ON p.id = e.user_id
       WHERE e.bet_id = p_bet_id AND e.user_id = v_user_id
     ), '[]'::jsonb));
  ELSE
     -- Show all
     v_bet := jsonb_set(v_bet, '{participants}', COALESCE((
       SELECT jsonb_agg(
         jsonb_build_object(
            'id', e.id,
            'user_id', e.user_id,
            'vote', e.vote,
            'amount', e.amount,
            'created_at', e.created_at,
            'username', p.username
         )
       )
       FROM public.bet_entries e
       JOIN public.profiles p ON p.id = e.user_id
       WHERE e.bet_id = p_bet_id
     ), '[]'::jsonb));
  END IF;
  
  -- Attach aggregates
  v_bet := v_bet || v_entries;
  v_bet := jsonb_set(v_bet, '{has_access}', 'true'::jsonb);

  RETURN v_bet;
END;
$$;

-- 9. Fix Comments RLS
DROP POLICY IF EXISTS "comments_read" ON public.comments;
CREATE POLICY "comments_read"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    (
       is_hidden = FALSE 
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
       OR user_id = auth.uid()
    )
    AND
    EXISTS (
       SELECT 1 FROM public.bets WHERE id = comments.bet_id
    )
  );
