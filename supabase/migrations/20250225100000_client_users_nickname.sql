-- Добавить поле nickname в client.users (уникальное, для раздела сообщества)
ALTER TABLE client.users
  ADD COLUMN IF NOT EXISTS nickname text UNIQUE;
