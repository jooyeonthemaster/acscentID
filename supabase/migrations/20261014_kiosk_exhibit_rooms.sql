-- Receiver and controller have separate hashed bearer capabilities. No public RLS policy.
CREATE TABLE IF NOT EXISTS public.kiosk_exhibit_rooms (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
  kind text NOT NULL CHECK (kind IN ('product', 'heritage', 'vision-wall')),
  controller_hash text NOT NULL,
  viewer_hash text NOT NULL,
  expires_at bigint NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  sequence integer NOT NULL DEFAULT 0,
  acknowledged_sequence integer NOT NULL DEFAULT 0,
  acknowledged_at bigint,
  viewer_seen_at bigint,
  content jsonb,
  last_request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kiosk_exhibit_rooms ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS kiosk_exhibit_rooms_expiry_idx ON public.kiosk_exhibit_rooms (expires_at);
