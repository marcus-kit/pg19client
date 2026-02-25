-- Фаза 1.5: Таблица client.accounts (связь user ↔ contract, данные для ЛК)
CREATE TABLE IF NOT EXISTS client.accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  contract_id text NOT NULL,
  contract_number text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  address_full text,
  start_date date,
  created_at timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  UNIQUE(user_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON client.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_contract_id ON client.accounts(contract_id);
