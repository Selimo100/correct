-- =====================================================
-- CATEGORIES SYSTEM - Predefined and admin-managed
-- =====================================================
-- This migration creates categories table and seeds defaults
-- =====================================================

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_by_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active) WHERE is_active = TRUE;

-- Add category_id to bets table
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_bets_category_id ON public.bets(category_id);

-- Seed default categories (idempotent)
INSERT INTO public.categories (slug, name, icon, is_active, is_default, created_at) VALUES
  ('love', 'Love', '💕', TRUE, TRUE, NOW()),
  ('sunrise', 'Sunrise', '🌅', TRUE, TRUE, NOW()),
  ('school', 'School', '🎓', TRUE, TRUE, NOW()),
  ('random', 'Random', '🎲', TRUE, TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Migrate existing category text to category_id (if there was a text field)
-- This assumes there was a text "category" field - if not, skip this
DO $$
DECLARE
  v_category_record RECORD;
BEGIN
  -- Only run if old category column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bets' AND column_name = 'category' AND table_schema = 'public'
  ) THEN
    -- Map old categories to new IDs
    FOR v_category_record IN 
      SELECT DISTINCT category FROM public.bets WHERE category IS NOT NULL
    LOOP
      -- Try to match by slug (lowercase)
      UPDATE public.bets b
      SET category_id = c.id
      FROM public.categories c
      WHERE LOWER(b.category) = c.slug AND b.category_id IS NULL;
    END LOOP;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "categories_select_active"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Only admins can create categories
CREATE POLICY "categories_insert_admin"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
  );

-- Only admins can update categories
CREATE POLICY "categories_update_admin"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE))
  );

-- =====================================================
-- FUNCTION: List categories
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_list_categories(
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  name TEXT,
  icon TEXT,
  is_active BOOLEAN,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_include_inactive THEN
    RETURN QUERY
    SELECT c.id, c.slug, c.name, c.icon, c.is_active, c.is_default, c.created_at
    FROM categories c
    ORDER BY c.is_default DESC, c.name ASC;
  ELSE
    RETURN QUERY
    SELECT c.id, c.slug, c.name, c.icon, c.is_active, c.is_default, c.created_at
    FROM categories c
    WHERE c.is_active = TRUE
    ORDER BY c.is_default DESC, c.name ASC;
  END IF;
END;
$$;

-- =====================================================
-- FUNCTION: Create category (admin only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_create_category(
  p_name TEXT,
  p_slug TEXT,
  p_icon TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_new_id UUID;
BEGIN
  -- Check if caller is admin
  SELECT is_admin OR is_super_admin INTO v_is_admin
  FROM profiles WHERE id = COALESCE(p_admin_id, auth.uid());
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Insert category
  INSERT INTO categories (name, slug, icon, created_by_id)
  VALUES (p_name, p_slug, p_icon, COALESCE(p_admin_id, auth.uid()))
  RETURNING id INTO v_new_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'category_id', v_new_id
  );
END;
$$;

-- =====================================================
-- FUNCTION: Update category (admin only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_update_category(
  p_category_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_super_admin BOOLEAN;
  v_is_default BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT is_admin OR is_super_admin, is_super_admin 
  INTO v_is_admin, v_is_super_admin
  FROM profiles WHERE id = COALESCE(p_admin_id, auth.uid());
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Check if category is default
  SELECT is_default INTO v_is_default
  FROM categories WHERE id = p_category_id;
  
  -- Only super admin can disable default categories
  IF v_is_default AND p_is_active = FALSE AND NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only super admin can disable default categories';
  END IF;
  
  -- Update category
  UPDATE categories 
  SET 
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    icon = COALESCE(p_icon, icon),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_category_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.fn_list_categories TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_category TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_category TO authenticated;

COMMENT ON TABLE public.categories IS 'Categories for organizing bets';
COMMENT ON FUNCTION public.fn_list_categories IS 'Lists categories (optionally including inactive)';
COMMENT ON FUNCTION public.fn_create_category IS 'Creates a new category (admin only)';
COMMENT ON FUNCTION public.fn_update_category IS 'Updates a category (admin only)';
