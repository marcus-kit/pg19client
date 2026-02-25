-- Фаза 1.2: Таблица client.ticket_comments
CREATE TABLE IF NOT EXISTS client.ticket_comments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id text NOT NULL REFERENCES client.tickets(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_id text,
  author_name text,
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  is_solution boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  edited_at timestamp without time zone
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON client.ticket_comments(ticket_id);
