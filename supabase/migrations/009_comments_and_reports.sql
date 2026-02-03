-- =====================================================
-- COMMENTS & MODERATION SYSTEM
-- =====================================================

-- 1. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_bet ON public.comments(bet_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at);

-- 2. Comment Reports Table
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(comment_id, reporter_id) -- One report per user per comment
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.comment_reports(status);

-- 3. RLS Policies

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Read: Everyone can read content from active bets (or if they are admin)
-- But only if not hidden? Or hidden shows "Content hidden"?
-- We'll filter hidden in UI or return placeholder. For now, strict:
CREATE POLICY "comments_read"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    is_hidden = FALSE 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
    OR user_id = auth.uid()
  );

-- Create: Only ACTIVE users
CREATE POLICY "comments_create_active"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ACTIVE')
  );

-- Update: Users can edit own comments? Maybe not. Admins can.
-- For now, no edit for users to keep it simple and immutable for ledger context.
-- Admins can update (hide)
CREATE POLICY "comments_update_admin"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
  );

-- Reports
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_create_active"
  ON public.comment_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ACTIVE')
  );

CREATE POLICY "reports_read_admin"
  ON public.comment_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
  );

CREATE POLICY "reports_update_admin"
  ON public.comment_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
  );


-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create comment (ensures status ACTIVE)
CREATE OR REPLACE FUNCTION public.fn_create_comment(
  p_bet_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_status TEXT;
  v_new_id UUID;
BEGIN
  -- Check user status
  SELECT status INTO v_user_status FROM profiles WHERE id = auth.uid();
  
  IF v_user_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Only active users can comment';
  END IF;

  INSERT INTO comments (bet_id, user_id, content, parent_id)
  VALUES (p_bet_id, auth.uid(), p_content, p_parent_id)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'comment_id', v_new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_comment TO authenticated;
