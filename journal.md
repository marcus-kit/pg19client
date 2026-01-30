# pg19v3client — Журнал изменений

## 2026-01-30: Интеграция с billing системой

### Изменения

**API обновлены для использования billing views:**
- `server/api/invoices/index.get.ts` → invoices_view
- `server/api/invoices/unpaid.get.ts` → invoices_view
- `server/api/contracts/index.get.ts` → contracts_view (новый)
- `server/api/services/index.get.ts` → services_view
- `server/api/account/subscriptions.get.ts` → subscriptions_view

**Изменения в авторизации:**
- 9 файлов в `server/api/auth/` обновлены: accounts → contracts_view
- Все `.eq('account_id', ...)` заменены на `.eq('user_id', ...)`

### Архитектура

```
billing схема (источник истины)
    ↓ PostgreSQL Views
public схема (contracts_view, invoices_view, ...)
    ↓ Supabase API
pg19v3client
```

### Commits
- `a502c97` — refactor: use billing views for data access
- `fix: use views instead of renamed tables`
