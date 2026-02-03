-- MIGRATION: 013_friends_and_groups_schema.sql

-- 1. Friend Requests
CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz NULL,
  CONSTRAINT friend_requests_no_self_request CHECK (from_user_id <> to_user_id),
  UNIQUE (from_user_id, to_user_id)
);

-- 2. Friendships (Bidirectional, 2 rows per friendship for easy querying)
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT friendships_no_self_friend CHECK (user_id <> friend_id),
  UNIQUE (user_id, friend_id)
);

-- 3. Blocks
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT blocks_no_self_block CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

-- 4. Groups
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
  description text NULL CHECK (char_length(description) <= 200),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (owner_id, name)
);

-- 5. Group Members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- 6. Bet Recipients (Access Control for Non-Public Bets)
CREATE TABLE public.bet_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  UNIQUE (bet_id, user_id)
);

-- 7. Update Bets Table
ALTER TABLE public.bets 
ADD COLUMN audience text DEFAULT 'PUBLIC' CHECK (audience IN ('PUBLIC', 'FRIENDS', 'GROUP', 'PRIVATE')),
ADD COLUMN group_id uuid NULL REFERENCES public.groups(id) ON DELETE SET NULL;

-- Migrate existing PRIVATE bets to audience='PRIVATE'
UPDATE public.bets SET audience = 'PRIVATE' WHERE visibility = 'PRIVATE';
-- (We keep visibility column for backward compat or drop it later, let's keep it sync in logic for now)


-- RLS POLICIES

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_recipients ENABLE ROW LEVEL SECURITY;

-- Friend Requests Policies
CREATE POLICY "Users can read requests they sent or received"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests involved in"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
  
-- Friendships Policies
CREATE POLICY "Users can see their own friends"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id);

-- Blocks Policies
CREATE POLICY "Users can see blocks they created"
  ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id);
  
CREATE POLICY "Users can create blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete blocks"
  ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Groups Policies
CREATE POLICY "Owners can see their groups"
  ON public.groups FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Group members can see groups they belong to"
  ON public.groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Owners can manage groups"
  ON public.groups FOR ALL
  USING (auth.uid() = owner_id);

-- Group Members Policies
CREATE POLICY "Owners can view members of their groups"
  ON public.group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()
  ));

CREATE POLICY "Members can view other members of same group"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members my_gm 
    WHERE my_gm.group_id = group_id AND my_gm.user_id = auth.uid()
  ));

CREATE POLICY "Owners can manage members"
  ON public.group_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()
  ));

-- Bet Recipients Policies
CREATE POLICY "Users can see bets granted to them"
  ON public.bet_recipients FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.bets b WHERE b.id = bet_id AND b.creator_id = auth.uid()
  ));
