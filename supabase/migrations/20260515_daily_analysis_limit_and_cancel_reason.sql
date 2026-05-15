-- Daily analysis usage limit and cancellation reason audit fields

-- Count all paid/product analysis attempts together, resetting at Korea midnight.
CREATE TABLE IF NOT EXISTS analysis_daily_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usage_date DATE NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  max_count INTEGER NOT NULL DEFAULT 3 CHECK (max_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT analysis_daily_usage_unique_user_day UNIQUE (usage_date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_daily_usage_user_date
  ON analysis_daily_usage(user_id, usage_date DESC);

COMMENT ON TABLE analysis_daily_usage IS
  'Daily product-analysis usage counter. All analysis product types share one daily limit and reset at 00:00 Asia/Seoul.';
COMMENT ON COLUMN analysis_daily_usage.usage_date IS
  'Korea-local calendar date used for the daily reset boundary.';
COMMENT ON COLUMN analysis_daily_usage.used_count IS
  'Number of analysis attempts consumed on usage_date. Attempts are not carried over.';

ALTER TABLE analysis_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS analysis_usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_usage_id UUID REFERENCES analysis_daily_usage(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT,
  product_type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  target_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_usage_events_user_date
  ON analysis_usage_events(user_id, usage_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_usage_events_product_type
  ON analysis_usage_events(product_type, created_at DESC);

COMMENT ON TABLE analysis_usage_events IS
  'Immutable audit log for every consumed analysis attempt.';

ALTER TABLE analysis_usage_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_daily_analysis_usage(
  p_user_id TEXT,
  p_provider TEXT DEFAULT NULL,
  p_product_type TEXT DEFAULT 'image_analysis',
  p_endpoint TEXT DEFAULT 'unknown',
  p_target_type TEXT DEFAULT NULL,
  p_daily_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  allowed BOOLEAN,
  used_count INTEGER,
  remaining_count INTEGER,
  daily_limit INTEGER,
  usage_date DATE,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
  v_reset_at TIMESTAMPTZ := ((v_today + 1)::TIMESTAMP AT TIME ZONE 'Asia/Seoul');
  v_daily_usage_id UUID;
  v_used_count INTEGER;
  v_limit INTEGER := GREATEST(COALESCE(p_daily_limit, 3), 1);
BEGIN
  IF p_user_id IS NULL OR BTRIM(p_user_id) = '' THEN
    allowed := FALSE;
    used_count := 0;
    remaining_count := v_limit;
    daily_limit := v_limit;
    usage_date := v_today;
    reset_at := v_reset_at;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO analysis_daily_usage (
    usage_date,
    user_id,
    provider,
    used_count,
    max_count,
    last_used_at,
    updated_at
  )
  VALUES (
    v_today,
    p_user_id,
    p_provider,
    1,
    v_limit,
    NOW(),
    NOW()
  )
  ON CONFLICT (usage_date, user_id)
  DO UPDATE SET
    used_count = analysis_daily_usage.used_count + 1,
    provider = COALESCE(EXCLUDED.provider, analysis_daily_usage.provider),
    max_count = v_limit,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE analysis_daily_usage.used_count < v_limit
  RETURNING id, used_count
    INTO v_daily_usage_id, v_used_count;

  IF v_daily_usage_id IS NULL THEN
    SELECT adu.id, adu.used_count
      INTO v_daily_usage_id, v_used_count
      FROM analysis_daily_usage AS adu
     WHERE adu.usage_date = v_today
       AND adu.user_id = p_user_id;

    allowed := FALSE;
    used_count := COALESCE(v_used_count, v_limit);
    remaining_count := GREATEST(v_limit - COALESCE(v_used_count, v_limit), 0);
    daily_limit := v_limit;
    usage_date := v_today;
    reset_at := v_reset_at;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO analysis_usage_events (
    daily_usage_id,
    usage_date,
    user_id,
    provider,
    product_type,
    endpoint,
    target_type
  )
  VALUES (
    v_daily_usage_id,
    v_today,
    p_user_id,
    p_provider,
    COALESCE(NULLIF(BTRIM(p_product_type), ''), 'unknown'),
    COALESCE(NULLIF(BTRIM(p_endpoint), ''), 'unknown'),
    NULLIF(BTRIM(COALESCE(p_target_type, '')), '')
  );

  allowed := TRUE;
  used_count := v_used_count;
  remaining_count := GREATEST(v_limit - v_used_count, 0);
  daily_limit := v_limit;
  usage_date := v_today;
  reset_at := v_reset_at;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION consume_daily_analysis_usage(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_daily_analysis_usage(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

COMMENT ON COLUMN orders.cancel_reason IS
  'Customer/admin-provided cancellation request reason. Required by application code for customer cancellation requests.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_refund_reason_required_when_refunded'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_refund_reason_required_when_refunded
      CHECK (
        refunded_at IS NULL
        OR (refund_reason IS NOT NULL AND LENGTH(BTRIM(refund_reason)) >= 2)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refund_logs_reason_required'
  ) THEN
    ALTER TABLE refund_logs
      ADD CONSTRAINT refund_logs_reason_required
      CHECK (reason IS NOT NULL AND LENGTH(BTRIM(reason)) >= 2) NOT VALID;
  END IF;
END $$;
