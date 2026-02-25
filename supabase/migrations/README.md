# Миграции БД (схема client)

Выполнить по порядку через psql (подключение к БД проекта):

```bash
psql "postgresql://USER:PASSWORD@HOST:PORT/postgres" -f supabase/migrations/20250220000001_client_tickets_columns.sql
# ... и остальные файлы по возрастанию номера
```

Или одной командой из корня проекта:

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

Убедитесь, что переменная `DATABASE_URL` или параметры подключения соответствуют вашей БД.
