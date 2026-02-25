-- Фаза 1.1: Добавить колонки в client.tickets
ALTER TABLE client.tickets
  ADD COLUMN IF NOT EXISTS first_response_at timestamp without time zone NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp without time zone NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamp without time zone NULL;
