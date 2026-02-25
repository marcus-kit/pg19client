-- Фаза 1.4: Таблица client.phone_verification_requests
CREATE TABLE IF NOT EXISTS client.phone_verification_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token text NOT NULL UNIQUE,
  phone text NOT NULL,
  code text NOT NULL,
  user_id text NOT NULL,
  account_id text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_requests_phone ON client.phone_verification_requests(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verification_requests_status ON client.phone_verification_requests(status);
