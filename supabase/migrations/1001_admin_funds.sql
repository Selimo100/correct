-- MIGRATION: 1001_admin_funds.sql
-- Function to allow admins to grant funds to users

CREATE OR REPLACE FUNCTION fn_admin_add_funds(
  p_target_user_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_new_balance numeric;
BEGIN
  -- 1. Check if caller is admin
  v_admin_id := auth.uid();
  
  SELECT (is_admin OR is_super_admin) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 2. Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- 3. Insert transaction
  INSERT INTO public.wallet_ledger (
    user_id,
    amount,
    type,
    metadata,
    created_at
  ) VALUES (
    p_target_user_id,
    p_amount,
    'ADMIN_ADJUSTMENT',
    jsonb_build_object('reason', p_reason, 'granted_by', v_admin_id),
    now()
  );

  -- 4. Get new balance (optional, usually calculated on read, but useful for return)
  -- SELECT COALESCE(SUM(amount), 0) INTO v_new_balance ... 
  -- Simplified: just return success
  
  RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$;
