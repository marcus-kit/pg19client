# pg19v3client Gotchas

## Billing Integration Gotchas

### ❌ Не используй старые таблицы

```typescript
// НЕПРАВИЛЬНО — таблицы переименованы в *_backup!
.from('accounts')
.from('invoices')
.from('services')
.from('subscriptions')

// ПРАВИЛЬНО — используй views
.from('contracts_view')
.from('invoices_view')
.from('services_view')
.from('subscriptions_view')
```

### ❌ Не используй account_id

```typescript
// НЕПРАВИЛЬНО — в views нет account_id
.eq('account_id', sessionUser.accountId)

// ПРАВИЛЬНО — используй user_id
.eq('user_id', sessionUser.id)
```

### ❌ Не обращайся к billing схеме напрямую

```typescript
// НЕПРАВИЛЬНО — нет user_id в billing таблицах
.schema('billing').from('invoices')

// ПРАВИЛЬНО — views в public схеме
.from('invoices_view')  // user_id добавлен через JOIN
```

### Views структура

Views добавляют `user_id` через JOIN с `user_customer_links`, поэтому фильтрация по пользователю работает автоматически.
