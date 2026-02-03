-- Migration 1003: Fix Visibility Logic for Friends and Groups
-- Updates RLS and fn_get_bet_detail to strictly enforce audience rules

-- 1. Update fn_get_bet_detail to check audience and participation
CREATE OR REPLACE FUNCTION fn_get_bet_detail(p_bet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_audience text;
  v_group_id uuid;
  v_invite_code_enabled boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Get bet data
  SELECT 
    to_jsonb(b.*), b.hide_participants, b.creator_id, b.visibility, b.audience, b.group_id, b.invite_code_enabled,
    EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND (is_admin = TRUE OR is_super_admin = TRUE))
  INTO v_bet, v_hide_participants, v_creator_id, v_visibility, v_audience, v_group_id, v_invite_code_enabled, v_is_admin
  FROM public.bets b
  WHERE b.id = p_bet_id;
  
  IF v_bet IS NULL THEN RETURN NULL; END IF;

  -- Default Access: Creator and Admin always have access
  IF v_creator_id = v_user_id OR v_is_admin THEN
      v_has_access := TRUE;
  ELSE
      v_has_access := FALSE;
      
      -- Check if user is already a participant (If you bet, you see it)
      IF EXISTS (SELECT 1 FROM public.bet_entries WHERE bet_id = p_bet_id AND user_id = v_user_id) THEN
          v_has_access := TRUE;
      ELSE
          -- Evaluate based on Audience
          CASE 
              WHEN v_audience = 'PUBLIC' THEN
                   v_has_access := TRUE;
                   
              WHEN v_audience = 'FRIENDS' THEN
                   -- Check friendship
                   SELECT EXISTS (
                       SELECT 1 FROM public.friendships f 
                       WHERE (f.user_id = v_user_id AND f.friend_id = v_creator_id)
                          OR (f.friend_id = v_user_id AND f.user_id = v_creator_id)
                   ) INTO v_has_access;
                   
              WHEN v_audience = 'GROUP' THEN
                   -- Check group membership
                   SELECT EXISTS (
                       SELECT 1 FROM public.group_members gm 
                       WHERE gm.group_id = v_group_id AND gm.user_id = v_user_id
                   ) INTO v_has_access;
                   
              WHEN v_audience = 'PRIVATE' THEN
                   -- Check explicitly granted access
                   SELECT EXISTS (
                       SELECT 1 FROM public.bet_recipients br WHERE br.bet_id = p_bet_id AND br.user_id = v_user_id
                   ) OR EXISTS (
                       SELECT 1 FROM public.bet_access ba WHERE ba.bet_id = p_bet_id AND ba.user_id = v_user_id
                   ) INTO v_has_access;
                   
              ELSE
                   v_has_access := FALSE;
          END CASE;
      END IF;
  END IF;

  -- Handle Access Denial
  IF NOT v_has_access THEN
     -- For PRIVATE or bets with invite code enabled, show the "Gate" (returns details with has_access=false)
     -- This allows entering the Invite Code
     IF v_audience = 'PRIVATE' OR v_invite_code_enabled THEN
         RETURN jsonb_build_object(
           'id', p_bet_id, 
           'visibility', 'PRIVATE',  -- Force frontend to show Gate
           'has_access', false, 
           'invite_code_enabled', v_invite_code_enabled
         );
     ELSE
         -- For Friends/Groups without code, strictly hide
         RETURN NULL;
     END IF;
  END IF;

  -- Stats
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
     v_bet := jsonb_set(v_bet, '{participants}', COALESCE((
       SELECT jsonb_agg(jsonb_build_object(
         'id', e.id, 
         'user_id', e.user_id, 
         'vote', e.side, 
         'amount', e.stake, 
         'created_at', e.created_at, 
         'username', p.username
       ))
       FROM public.bet_entries e JOIN public.profiles p ON p.id = e.user_id 
       WHERE e.bet_id = p_bet_id AND e.user_id = v_user_id
     ), '[]'::jsonb));
  ELSE
     v_bet := jsonb_set(v_bet, '{participants}', COALESCE((
       SELECT jsonb_agg(jsonb_build_object(
         'id', e.id, 
         'user_id', e.user_id, 
         'vote', e.side, 
         'amount', e.stake, 
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


-- 2. Update RLS Policy
DROP POLICY IF EXISTS "bets_select_policy" ON public.bets;
DROP POLICY IF EXISTS "bets_select_public_or_own" ON public.bets;

CREATE POLICY "bets_select_policy_v2"
  ON public.bets
  FOR SELECT
  TO authenticated
  USING (
    -- 1. Admin / Creator
    (creator_id = auth.uid()) OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))) OR

    -- 2. Not Hidden AND (Public OR Participant OR Audience Access)
    (hidden = FALSE AND (
        -- PUBLIC
        (audience = 'PUBLIC') OR
        
        -- Is Participant (If you bet, you see it)
        EXISTS (SELECT 1 FROM public.bet_entries be WHERE be.bet_id = id AND be.user_id = auth.uid()) OR
        
        -- FRIENDS
        (audience = 'FRIENDS' AND EXISTS (
           SELECT 1 FROM public.friendships f 
           WHERE (f.user_id = auth.uid() AND f.friend_id = creator_id)
              OR (f.friend_id = auth.uid() AND f.user_id = creator_id)
        )) OR
        
        -- GROUP
        (audience = 'GROUP' AND EXISTS (
           SELECT 1 FROM public.group_members gm 
           WHERE gm.group_id = bets.group_id AND gm.user_id = auth.uid()
        )) OR
        
        -- PRIVATE (Explicit Access)
        (audience = 'PRIVATE' AND (
            EXISTS (SELECT 1 FROM public.bet_recipients br WHERE br.bet_id = id AND br.user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.bet_access ba WHERE ba.bet_id = id AND ba.user_id = auth.uid())
        ))
    ))
  );
