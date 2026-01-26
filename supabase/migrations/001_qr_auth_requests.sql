-- Таблица для QR-код авторизации через Telegram Web App
-- Выполнить в Supabase SQL Editor: https://studio.doka.team

CREATE TABLE IF NOT EXISTS qr_auth_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scanned', 'confirmed', 'expired', 'used')),

  -- Веб-клиент (кто показал QR)
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- TG App (кто отсканировал и подтвердил)
  user_id UUID REFERENCES users(id),
  account_id UUID REFERENCES accounts(id),
  telegram_id TEXT,
  telegram_username TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  scanned_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_qr_auth_requests_token ON qr_auth_requests(token);
CREATE INDEX IF NOT EXISTS idx_qr_auth_requests_status ON qr_auth_requests(status);
CREATE INDEX IF NOT EXISTS idx_qr_auth_requests_expires_at ON qr_auth_requests(expires_at);

-- Включаем Realtime для таблицы (для broadcast событий)
ALTER PUBLICATION supabase_realtime ADD TABLE qr_auth_requests;

-- Комментарии
COMMENT ON TABLE qr_auth_requests IS 'Запросы авторизации через QR-код (TG Web App → Web Client)';
COMMENT ON COLUMN qr_auth_requests.token IS '32-символьный криптографический токен';
COMMENT ON COLUMN qr_auth_requests.status IS 'pending → scanned → confirmed → used | expired';
