-- =====================================================
-- CORRECT? BETTING APP - BOOTSTRAP DEFAULT ADMIN
-- =====================================================
-- This migration creates a function to bootstrap the default
-- super admin user (selina@mogicato.ch) when they sign up.
-- =====================================================

-- =====================================================
-- FUNCTION: Bootstrap Super Admin
-- =====================================================
-- This function checks if a user with the email selina@mogicato.ch
-- exists and marks them as super admin if they're the first admin.
CREATE OR REPLACE FUNCTION bootstrap_super_admin()
RETURNS void AS $$
DECLARE
  v_admin_user_id UUID;
  v_admin_count INTEGER;
BEGIN
  -- Check if any super admins exist
  SELECT COUNT(*) INTO v_admin_count
  FROM public.profiles
  WHERE is_super_admin = TRUE;
  
  -- Only bootstrap if no super admins exist
  IF v_admin_count = 0 THEN
    -- Find user with email selina@mogicato.ch
    SELECT id INTO v_admin_user_id
    FROM auth.users
    WHERE email = 'selina@mogicato.ch'
    LIMIT 1;
    
    -- If user exists, promote to super admin
    IF v_admin_user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET is_admin = TRUE, is_super_admin = TRUE
      WHERE id = v_admin_user_id;
      
      RAISE NOTICE 'Bootstrap: selina@mogicato.ch promoted to super admin';
    ELSE
      RAISE NOTICE 'Bootstrap: selina@mogicato.ch not found in auth.users';
    END IF;
  ELSE
    RAISE NOTICE 'Bootstrap: Super admin already exists, skipping';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Auto-promote on Profile Creation
-- =====================================================
-- If the user email is selina@mogicato.ch, automatically
-- set them as super admin on profile creation.
CREATE OR REPLACE FUNCTION auto_promote_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_super_admin_count INTEGER;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Check if this is the bootstrap admin email
  IF v_email = 'selina@mogicato.ch' THEN
    -- Check if any super admins already exist
    SELECT COUNT(*) INTO v_super_admin_count
    FROM public.profiles
    WHERE is_super_admin = TRUE;
    
    -- Promote to super admin if first one OR if email matches
    IF v_super_admin_count = 0 OR v_email = 'selina@mogicato.ch' THEN
      NEW.is_admin := TRUE;
      NEW.is_super_admin := TRUE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_promote_super_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_super_admin();

-- =====================================================
-- RPC: Manual Bootstrap (for existing users)
-- =====================================================
-- Allows manual triggering of bootstrap function
CREATE OR REPLACE FUNCTION rpc_bootstrap_super_admin()
RETURNS JSONB AS $$
BEGIN
  PERFORM bootstrap_super_admin();
  RETURN jsonb_build_object('success', true, 'message', 'Bootstrap completed');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (anyone can call, but function checks logic internally)
GRANT EXECUTE ON FUNCTION rpc_bootstrap_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_bootstrap_super_admin() TO anon;
