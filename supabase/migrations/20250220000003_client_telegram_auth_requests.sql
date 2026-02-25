-- Фаза 1.3: Таблица client.telegram_auth_requests
CREATE TABLE IF NOT EXISTS client.telegram_auth_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token text NOT NULL UNIQUE,
  purpose text NOT NULL,
  user_id text,
  account_id text,
  telegram_id bigint,
  telegram_username text,
  ip_address text,
  user_agent text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_telegram_auth_requests_token ON client.telegram_auth_requests(token);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_requests_status ON client.telegram_auth_requests(status);
