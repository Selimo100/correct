-- Notifications System Migration
-- Created at 2026-02-06
-- Includes:
-- 1. Table schema and RLS
-- 2. Core RPC functions (notify, list, mark read)
-- 3. Integration hooks (bet resolve/void, friends, groups)

-- =====================================================
-- 1. SCHEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- e.g. 'BET_RESOLVED', 'WALLET_PAYOUT'
    title text NOT NULL,
    body text,
    icon text, -- 'bell', 'check', 'alert', 'user-plus'
    action_url text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz,
    -- Store dedupe key in metadata usually, or explicit column? 
    -- User requested unique(user_id, (metadata->>'dedupe_key'))
    CONSTRAINT notifications_type_check CHECK (char_length(type) > 0)
);

-- Derived column isRead logic handled by query or client, stored 'read_at' is sufficient context.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- Unique index for deduplication
-- Note: 'dedupe_key' inside metadata
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe 
ON public.notifications(user_id, ((metadata->>'dedupe_key'))) 
WHERE (metadata->>'dedupe_key') IS NOT NULL;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid()); 
    -- Typically only allow updating read_at, but general update is fine for owner.

-- Insert Policy: Only server-side functions (Security Definer) or triggers should insert.
-- We do NOT allow direct client inserts usually.
-- But if we want strictly no client inserts:
CREATE POLICY "No direct client inserts"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (false); -- Deny all direct inserts from client API

-- =====================================================
-- 2. CORE RPC FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION fn_notify(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_body text DEFAULT NULL,
    p_action_url text DEFAULT NULL,
    p_icon text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_dedupe_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id uuid;
    v_final_metadata jsonb;
BEGIN
    v_final_metadata := p_metadata;
    IF p_dedupe_key IS NOT NULL THEN
        v_final_metadata := jsonb_set(v_final_metadata, '{dedupe_key}', to_jsonb(p_dedupe_key));
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, action_url, icon, metadata)
    VALUES (p_user_id, p_type, p_title, p_body, p_action_url, p_icon, v_final_metadata)
    ON CONFLICT ((user_id), ((metadata->>'dedupe_key'))) WHERE (metadata->>'dedupe_key') IS NOT NULL
    DO UPDATE SET
        created_at = now(), -- bump to top
        read_at = NULL,     -- mark unread again if it happens again (optional, dependent on UX preference. Let's say yes.)
        title = EXCLUDED.title,
        body = EXCLUDED.body
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_notifications(
    p_limit int DEFAULT 30,
    p_offset int DEFAULT 0
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.notifications
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION fn_unread_count()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count int;
BEGIN
    SELECT count(*) INTO v_count
    FROM public.notifications
    WHERE user_id = auth.uid() AND read_at IS NULL;
    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION fn_mark_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read_at = now()
    WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION fn_mark_all_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
END;
$$;


-- =====================================================
-- 3. INTEGRATION HOOKS (UPDATED RPCs)
-- =====================================================

-- 3.1 UPDATED RESOLVE_BET
-- Source: migrations/022_fix_resolve_calculations.sql + notifications
CREATE OR REPLACE FUNCTION resolve_bet(
  p_bet_id UUID,
  p_resolution BOOLEAN,
  p_fee_bps INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_bet RECORD;
  v_total_pot BIGINT;
  v_winners_total BIGINT;
  v_fee_amount BIGINT;
  v_payout_pot BIGINT;
  v_winner RECORD;
  v_payout BIGINT;
  v_total_paid BIGINT := 0;
  v_remainder BIGINT;
  v_is_admin BOOLEAN;
  v_payout_count INTEGER := 0;
  v_max_stake_user_id UUID;
  v_side_text TEXT;
BEGIN
  SET search_path = public;
  v_admin_id := auth.uid();
  
  -- Auth Check
  IF v_admin_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_admin_id;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  
  -- Lock Bet
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Bet not found'); END IF;
  
  IF v_bet.status != 'OPEN' THEN RETURN jsonb_build_object('success', false, 'error', 'Bet already resolved or voided'); END IF;
  IF v_bet.end_at > NOW() THEN RETURN jsonb_build_object('success', false, 'error', 'Bet has not ended yet'); END IF;
  
  -- Idempotency Check
  BEGIN
    INSERT INTO public.bet_settlements (bet_id, outcome, settled_by_id, settled_at)
    VALUES (p_bet_id, p_resolution, v_admin_id, NOW());
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'message', 'Bet already settled', 'already_settled', true);
  END;
  
  v_side_text := CASE WHEN p_resolution THEN 'YES' ELSE 'NO' END;

  -- 1. Notify Bet Creator (Optional: "Your bet was resolved")
  -- PERFORM fn_notify(v_bet.creator_id, 'BET_RESOLVED', 'Bet Resolved: ' || v_bet.title, 'Outcome: ' || v_side_text, '/bets/' || p_bet_id, 'check', '{}'::jsonb, 'bet:' || p_bet_id || ':resolved');

  SELECT COALESCE(SUM(stake)::BIGINT, 0) INTO v_total_pot FROM public.bet_entries WHERE bet_id = p_bet_id;
  
  -- Handle Empty Pot
  IF v_total_pot = 0 THEN
    UPDATE public.bets SET status = 'RESOLVED', resolution = p_resolution, resolved_at = NOW(), resolved_by_id = v_admin_id WHERE id = p_bet_id;
    UPDATE public.bet_settlements SET total_pot = 0, winners_total = 0, fee_amount = 0, payout_count = 0 WHERE bet_id = p_bet_id;
    INSERT INTO public.admin_actions (admin_id, action, target_id, metadata) VALUES (v_admin_id, 'RESOLVE_BET', p_bet_id, jsonb_build_object('resolution', p_resolution, 'pot', 0));
    
    -- Notify Creator of Empty Resolution
    PERFORM fn_notify(v_bet.creator_id, 'BET_RESOLVED', 'Bet Resolved (Empty)', 'Your bet "' || left(v_bet.title, 30) || '" ended with no entries.', '/bets/' || p_bet_id, 'check', '{}'::jsonb);
    
    RETURN jsonb_build_object('success', true, 'pot', 0);
  END IF;
  
  SELECT COALESCE(SUM(stake)::BIGINT, 0) INTO v_winners_total FROM public.bet_entries WHERE bet_id = p_bet_id AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END;
  
  -- Handle No Winners -> Auto Void
  IF v_winners_total = 0 THEN
    DELETE FROM public.bet_settlements WHERE bet_id = p_bet_id;
    INSERT INTO public.bet_settlements (bet_id, outcome, total_pot, winners_total, settled_by_id, settled_at, metadata) VALUES (p_bet_id, NULL, v_total_pot, 0, v_admin_id, NOW(), jsonb_build_object('reason', 'No winners - auto voided'));
    
    -- Refund Loop with Notifications
    FOR v_winner IN SELECT user_id, stake FROM public.bet_entries WHERE bet_id = p_bet_id LOOP
      INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
      VALUES (v_winner.user_id, v_winner.stake, 'BET_REFUND', p_bet_id, jsonb_build_object('reason', 'No winners - bet voided'));
      
      -- NOTIFICATION: Refund
      PERFORM fn_notify(
          v_winner.user_id, 
          'WALLET_REFUND', 
          'Bet Refunded', 
          'Refund: ' || v_winner.stake || ' credits. No winners in "' || left(v_bet.title, 20) || '..."', 
          '/wallet', 
          'refresh-cw',
          jsonb_build_object('amount', v_winner.stake),
          'bet:' || p_bet_id || ':refund:' || v_winner.user_id
      );
    END LOOP;
    
    UPDATE public.bets SET status = 'VOID', resolved_at = NOW(), resolved_by_id = v_admin_id WHERE id = p_bet_id;
    INSERT INTO public.admin_actions (admin_id, action, target_id, metadata) VALUES (v_admin_id, 'VOID_BET', p_bet_id, jsonb_build_object('reason', 'No winners', 'refunded', v_total_pot));
    RETURN jsonb_build_object('success', true, 'voided', true, 'refunded', v_total_pot);
  END IF;
  
  -- Standard Resolution
  v_fee_amount := (v_total_pot * p_fee_bps) / 10000;
  v_payout_pot := v_total_pot - v_fee_amount;
  
  -- 2. Notify ALL participants about resolution (Outcome announced)
  -- Doing this in a loop or single insert? We'll do it in the loop or a separate query.
  -- Let's stick to notifying WINNERS of PAYOUTS and LOSERS of RESOLUTION (or just one generic event per user).
  -- Strategy:
  -- Winners get WALLET_PAYOUT (implies resolution)
  -- Losers get BET_RESOLVED
  
  -- Loop Winners
  FOR v_winner IN
    SELECT user_id, stake
    FROM public.bet_entries
    WHERE bet_id = p_bet_id AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END
  LOOP
    v_payout := (v_winner.stake * v_payout_pot) / v_winners_total;
    
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
    VALUES (v_winner.user_id, v_payout, 'BET_PAYOUT', p_bet_id, jsonb_build_object('resolution', p_resolution, 'stake', v_winner.stake, 'payout', v_payout));
    
    v_total_paid := v_total_paid + v_payout;
    v_payout_count := v_payout_count + 1;

    -- NOTIFICATION: Payout
    PERFORM fn_notify(
        v_winner.user_id,
        'WALLET_PAYOUT',
        'You Won!',
        'You won ' || v_payout || ' credits on "' || left(v_bet.title, 30) || '"',
        '/wallet',
        'coins',
        jsonb_build_object('amount', v_payout, 'bet_id', p_bet_id),
        'bet:' || p_bet_id || ':payout:' || v_winner.user_id
    );
  END LOOP;
  
  -- Notify LOSERS
  FOR v_winner IN
    SELECT user_id FROM public.bet_entries
    WHERE bet_id = p_bet_id AND side != CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END
  LOOP
     PERFORM fn_notify(
        v_winner.user_id,
        'BET_RESOLVED',
        'Bet Resolved',
        'Outcome was ' || v_side_text || '. You did not win this time.',
        '/bets/' || p_bet_id,
        'flag',
        jsonb_build_object('bet_id', p_bet_id),
        'bet:' || p_bet_id || ':resolved:' || v_winner.user_id
     );
  END LOOP;

  -- Dust adjustment
  v_remainder := v_payout_pot - v_total_paid;
  IF v_remainder > 0 THEN
    SELECT user_id INTO v_max_stake_user_id FROM public.bet_entries WHERE bet_id = p_bet_id AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END ORDER BY stake DESC, created_at ASC LIMIT 1;
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata) VALUES (v_max_stake_user_id, v_remainder, 'BET_PAYOUT', p_bet_id, jsonb_build_object('type', 'rounding_adjustment', 'amount', v_remainder));
    v_total_paid := v_total_paid + v_remainder;
  END IF;
  
  -- Fee
  IF v_fee_amount > 0 THEN
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata) VALUES (v_admin_id, v_fee_amount, 'FEE', p_bet_id, jsonb_build_object('fee_bps', p_fee_bps));
  END IF;
  
  UPDATE public.bets SET status = 'RESOLVED', resolution = p_resolution, resolved_at = NOW(), resolved_by_id = v_admin_id WHERE id = p_bet_id;
  UPDATE public.bet_settlements SET total_pot = v_total_pot, winners_total = v_winners_total, fee_amount = v_fee_amount, payout_count = v_payout_count, metadata = jsonb_build_object('total_paid', v_total_paid) WHERE bet_id = p_bet_id;
  INSERT INTO public.admin_actions (admin_id, action, target_id, metadata) VALUES (v_admin_id, 'RESOLVE_BET', p_bet_id, jsonb_build_object('resolution', p_resolution, 'pot', v_total_pot));
  
  RETURN jsonb_build_object('success', true, 'paid_out', v_total_paid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3.2 UPDATED VOID_BET
CREATE OR REPLACE FUNCTION void_bet(p_bet_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_bet RECORD;
  v_participant RECORD;
  v_total_refunded BIGINT := 0;
  v_is_admin BOOLEAN;
BEGIN
  SET search_path = public;
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_admin_id;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Bet not found'); END IF;
  IF v_bet.status != 'OPEN' THEN RETURN jsonb_build_object('success', false, 'error', 'Bet already resolved or voided'); END IF;
  
  BEGIN
    INSERT INTO public.bet_settlements (bet_id, outcome, settled_by_id, settled_at, metadata)
    VALUES (p_bet_id, NULL, v_admin_id, NOW(), jsonb_build_object('action', 'void'));
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'message', 'Bet already voided', 'already_voided', true);
  END;
  
  FOR v_participant IN SELECT user_id, stake FROM public.bet_entries WHERE bet_id = p_bet_id LOOP
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
    VALUES (v_participant.user_id, v_participant.stake, 'BET_REFUND', p_bet_id, jsonb_build_object('reason', 'Bet voided by admin'));
    v_total_refunded := v_total_refunded + v_participant.stake;

    -- NOTIFICATION
    PERFORM fn_notify(
        v_participant.user_id,
        'BET_VOID',
        'Bet Voided',
        'Your stake of ' || v_participant.stake || ' was refunded for bet "' || left(v_bet.title, 30) || '"',
        '/bets/' || p_bet_id,
        'alert-triangle',
        jsonb_build_object('amount', v_participant.stake),
        'bet:' || p_bet_id || ':void:' || v_participant.user_id
    );
  END LOOP;
  
  UPDATE public.bets SET status = 'VOID', resolved_at = NOW(), resolved_by_id = v_admin_id WHERE id = p_bet_id;
  UPDATE public.bet_settlements SET total_pot = v_total_refunded WHERE bet_id = p_bet_id;
  INSERT INTO public.admin_actions (admin_id, action, target_id, metadata) VALUES (v_admin_id, 'VOID_BET', p_bet_id, jsonb_build_object('refunded', v_total_refunded));
  
  RETURN jsonb_build_object('success', true, 'voided', true, 'refunded', v_total_refunded);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3.3 UPDATED FRIEND REQUESTS
CREATE OR REPLACE FUNCTION fn_send_friend_request(p_to_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id uuid;
  v_from_username text;
  v_status text;
  v_count int;
BEGIN
  -- Get Recipient
  SELECT id INTO v_recipient_id FROM public.profiles WHERE username = p_to_username AND status = 'ACTIVE';
  IF v_recipient_id IS NULL THEN RAISE EXCEPTION 'User not found or disabled'; END IF;
  IF v_recipient_id = auth.uid() THEN RAISE EXCEPTION 'Cannot friend yourself'; END IF;

  -- Block/Friendship Checks
  IF EXISTS (SELECT 1 FROM public.blocks WHERE (blocker_id = auth.uid() AND blocked_id = v_recipient_id) OR (blocker_id = v_recipient_id AND blocked_id = auth.uid())) THEN RAISE EXCEPTION 'Cannot request this user'; END IF;
  IF EXISTS (SELECT 1 FROM public.friendships WHERE user_id = auth.uid() AND friend_id = v_recipient_id) THEN RAISE EXCEPTION 'Already friends'; END IF;

  SELECT status INTO v_status FROM public.friend_requests 
  WHERE (from_user_id = auth.uid() AND to_user_id = v_recipient_id) OR (from_user_id = v_recipient_id AND to_user_id = auth.uid()) ORDER BY created_at DESC LIMIT 1;
  IF v_status = 'PENDING' THEN RETURN 'Request already pending'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.friend_requests WHERE from_user_id = auth.uid() AND created_at > now() - interval '24 hours';
  IF v_count >= 20 THEN RAISE EXCEPTION 'Daily limit reached'; END IF;

  INSERT INTO public.friend_requests (from_user_id, to_user_id, status) VALUES (auth.uid(), v_recipient_id, 'PENDING');

  -- NOTIFICATION
  SELECT username INTO v_from_username FROM public.profiles WHERE id = auth.uid();
  PERFORM fn_notify(
      v_recipient_id,
      'FRIEND_REQUEST_INCOMING',
      'New Friend Request',
      v_from_username || ' sent you a friend request.',
      '/friends?tab=requests',
      'user-plus',
      jsonb_build_object('from_user', v_from_username),
      'friend_req:' || auth.uid() || ':' || v_recipient_id -- Dedupe active request
  );

  RETURN 'Request sent';
END;
$$;

-- 3.4 UPDATED RESPOND FRIEND REQUEST
CREATE OR REPLACE FUNCTION fn_respond_friend_request(p_request_id uuid, p_accept boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reqRecord record;
  v_accepter_username text;
BEGIN
  SELECT * INTO v_reqRecord FROM public.friend_requests WHERE id = p_request_id;
  IF v_reqRecord IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_reqRecord.to_user_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_reqRecord.status <> 'PENDING' THEN RAISE EXCEPTION 'Request not pending'; END IF;

  IF p_accept THEN
    UPDATE public.friend_requests SET status = 'ACCEPTED', responded_at = now() WHERE id = p_request_id;
    INSERT INTO public.friendships (user_id, friend_id) VALUES (v_reqRecord.from_user_id, v_reqRecord.to_user_id);
    INSERT INTO public.friendships (user_id, friend_id) VALUES (v_reqRecord.to_user_id, v_reqRecord.from_user_id);
    
    -- NOTIFICATION to Sender
    SELECT username INTO v_accepter_username FROM public.profiles WHERE id = auth.uid();
    PERFORM fn_notify(
        v_reqRecord.from_user_id,
        'FRIEND_REQUEST_ACCEPTED',
        'Friend Request Accepted',
        v_accepter_username || ' accepted your friend request.',
        '/friends',
        'user-check',
        jsonb_build_object('accepter', v_accepter_username)
    );
    
    RETURN 'Accepted';
  ELSE
    UPDATE public.friend_requests SET status = 'DECLINED', responded_at = now() WHERE id = p_request_id;
    RETURN 'Declined';
  END IF;
END;
$$;

-- 3.5 ADD GROUP MEMBER
CREATE OR REPLACE FUNCTION fn_add_group_member(p_group_id uuid, p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_friend_id uuid;
  v_group_name text;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_group_name FROM public.groups WHERE id = p_group_id;
  IF v_owner_id <> auth.uid() THEN RAISE EXCEPTION 'Not owner'; END IF;
  
  SELECT id INTO v_friend_id FROM public.profiles WHERE username = p_username;
  IF v_friend_id IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  
  IF v_friend_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM public.friendships WHERE user_id = auth.uid() AND friend_id = v_friend_id) THEN
     RAISE EXCEPTION 'Must be friend to add to group';
  END IF;
  
  BEGIN
    INSERT INTO public.group_members (group_id, user_id) VALUES (p_group_id, v_friend_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'Already member';
  END;

  -- NOTIFICATION
  PERFORM fn_notify(
      v_friend_id,
      'GROUP_ADDED',
      'Added to Group',
      'You were added to group "' || v_group_name || '"',
      '/groups',
      'users',
      jsonb_build_object('group_id', p_group_id)
  );
  
  RETURN 'Added';
END;
$$;
