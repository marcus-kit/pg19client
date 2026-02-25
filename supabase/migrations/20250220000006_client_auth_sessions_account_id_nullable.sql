-- Фаза 1.6: account_id в auth_sessions допускает NULL (пользователь без договора)
ALTER TABLE client.auth_sessions
  ALTER COLUMN account_id DROP NOT NULL;
