# Component Naming Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Унифицировать именование компонентов по правилу "папка = префикс" для устранения конфликтов auto-import.

**Architecture:** Переименование файлов компонентов + обновление использований в шаблонах. Правило: `components/{folder}/{Folder}{Name}.vue` → регистрируется как `{Folder}{Name}`.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript

---

## Task 1: Переименование ui/ компонентов

**Files:**
- Rename: `app/components/ui/UButton.vue` → `UiButton.vue`
- Rename: `app/components/ui/UCard.vue` → `UiCard.vue`
- Rename: `app/components/ui/UInput.vue` → `UiInput.vue`
- Rename: `app/components/ui/USelect.vue` → `UiSelect.vue`
- Rename: `app/components/ui/UToggle.vue` → `UiToggle.vue`
- Rename: `app/components/ui/UBadge.vue` → `UiBadge.vue`
- Rename: `app/components/ui/CallbackModal.vue` → `UiCallbackModal.vue`
- Rename: `app/components/ui/RelativeTime.vue` → `UiRelativeTime.vue`

**Step 1: Переименовать файлы**

```bash
cd /Users/doka/pg19v3client/app/components/ui
mv UButton.vue UiButton.vue
mv UCard.vue UiCard.vue
mv UInput.vue UiInput.vue
mv USelect.vue UiSelect.vue
mv UToggle.vue UiToggle.vue
mv UBadge.vue UiBadge.vue
mv CallbackModal.vue UiCallbackModal.vue
mv RelativeTime.vue UiRelativeTime.vue
```

**Step 2: Обновить использования во всех файлах**

Замены (используйте sed или вручную):
- `<UButton` → `<UiButton`
- `</UButton>` → `</UiButton>`
- `<UCard` → `<UiCard`
- `</UCard>` → `</UiCard>`
- `<UInput` → `<UiInput`
- `</UInput>` → `</UiInput>`
- `<USelect` → `<UiSelect`
- `</USelect>` → `</UiSelect>`
- `<UToggle` → `<UiToggle`
- `</UToggle>` → `</UiToggle>`
- `<UBadge` → `<UiBadge`
- `</UBadge>` → `</UiBadge>`
- `<CallbackModal` → `<UiCallbackModal`
- `<RelativeTime` → `<UiRelativeTime`

**Файлы для обновления (89 использований U* компонентов):**
- `app/pages/profile.vue`
- `app/pages/services.vue`
- `app/pages/login.vue`
- `app/pages/support/[id].vue`
- `app/pages/support/index.vue`
- `app/pages/invoices.vue`
- `app/pages/dashboard.vue`
- `app/components/dashboard/*.vue`
- `app/components/profile/*.vue`
- `app/components/news/Modal.vue`

**Step 3: Commit**

```bash
git add app/components/ui/
git add -u  # для удалённых файлов
git commit -m "refactor(ui): rename U* components to Ui* for naming consistency"
```

---

## Task 2: Переименование layout/ компонентов

**Files:**
- Rename: `app/components/layout/AppHeader.vue` → `LayoutHeader.vue`
- Rename: `app/components/layout/AppFooter.vue` → `LayoutFooter.vue`
- Modify: `app/layouts/default.vue` (если использует эти компоненты)

**Step 1: Переименовать файлы**

```bash
cd /Users/doka/pg19v3client/app/components/layout
mv AppHeader.vue LayoutHeader.vue
mv AppFooter.vue LayoutFooter.vue
```

**Step 2: Обновить использования**

Проверить и заменить:
- `<AppHeader` → `<LayoutHeader`
- `<AppFooter` → `<LayoutFooter`

**Step 3: Commit**

```bash
git add app/components/layout/
git add -u
git commit -m "refactor(layout): rename App* to Layout* for naming consistency"
```

---

## Task 3: Переименование dashboard/ компонентов

**Files:**
- Rename: `app/components/dashboard/BalanceCard.vue` → `DashboardBalanceCard.vue`
- Rename: `app/components/dashboard/ConnectionCard.vue` → `DashboardConnectionCard.vue`
- Rename: `app/components/dashboard/NewsModal.vue` → `DashboardNewsModal.vue`
- Rename: `app/components/dashboard/ReferralCard.vue` → `DashboardReferralCard.vue`

**Step 1: Переименовать файлы**

```bash
cd /Users/doka/pg19v3client/app/components/dashboard
mv BalanceCard.vue DashboardBalanceCard.vue
mv ConnectionCard.vue DashboardConnectionCard.vue
mv NewsModal.vue DashboardNewsModal.vue
mv ReferralCard.vue DashboardReferralCard.vue
```

**Step 2: Проверить использования**

Использования в `app/pages/dashboard.vue` уже корректны:
- `<DashboardBalanceCard />` ✓
- `<DashboardConnectionCard />` ✓
- `<DashboardReferralCard />` ✓
- `<DashboardNewsModal />` ✓

**Step 3: Commit**

```bash
git add app/components/dashboard/
git add -u
git commit -m "refactor(dashboard): add Dashboard prefix to component files"
```

---

## Task 4: Переименование connection/ компонентов

**Files:**
- Rename: `app/components/connection/MapPicker.vue` → `ConnectionMapPicker.vue`
- Rename: `app/components/connection/PhoneInput.vue` → `ConnectionPhoneInput.vue`
- Modify: `app/pages/login.vue` (использует PhoneInput, MapPicker)

**Step 1: Переименовать файлы**

```bash
cd /Users/doka/pg19v3client/app/components/connection
mv MapPicker.vue ConnectionMapPicker.vue
mv PhoneInput.vue ConnectionPhoneInput.vue
```

**Step 2: Обновить использования**

В `app/pages/login.vue`:
- `<MapPicker` → `<ConnectionMapPicker`
- `<PhoneInput` → `<ConnectionPhoneInput`

**Step 3: Commit**

```bash
git add app/components/connection/
git add -u
git commit -m "refactor(connection): add Connection prefix to component files"
```

---

## Task 5: Переименование news/ компонентов

**Files:**
- Rename: `app/components/news/Modal.vue` → `NewsModal.vue`

**Step 1: Переименовать файл**

```bash
cd /Users/doka/pg19v3client/app/components/news
mv Modal.vue NewsModal.vue
```

**Step 2: Проверить использования**

Найти где используется `<Modal` из news/ и заменить на `<NewsModal`.

**Step 3: Commit**

```bash
git add app/components/news/
git add -u
git commit -m "refactor(news): rename Modal to NewsModal"
```

---

## Task 6: Переименование profile/ компонентов

**Files:**
- Rename: `app/components/profile/Avatar.vue` → `ProfileAvatar.vue`
- Rename: `app/components/profile/Achievements.vue` → `ProfileAchievements.vue`
- Rename: `app/components/profile/AddressInfo.vue` → `ProfileAddressInfo.vue`
- Rename: `app/components/profile/ContactInfo.vue` → `ProfileContactInfo.vue`
- Rename: `app/components/profile/ContractInfo.vue` → `ProfileContractInfo.vue`
- Rename: `app/components/profile/Notifications.vue` → `ProfileNotifications.vue`
- Rename: `app/components/profile/PersonalInfo.vue` → `ProfilePersonalInfo.vue`
- Rename: `app/components/profile/Referral.vue` → `ProfileReferral.vue`
- Rename: `app/components/profile/Security.vue` → `ProfileSecurity.vue`
- Rename: `app/components/profile/TelegramLink.vue` → `ProfileTelegramLink.vue`

**Step 1: Переименовать файлы**

```bash
cd /Users/doka/pg19v3client/app/components/profile
mv Avatar.vue ProfileAvatar.vue
mv Achievements.vue ProfileAchievements.vue
mv AddressInfo.vue ProfileAddressInfo.vue
mv ContactInfo.vue ProfileContactInfo.vue
mv ContractInfo.vue ProfileContractInfo.vue
mv Notifications.vue ProfileNotifications.vue
mv PersonalInfo.vue ProfilePersonalInfo.vue
mv Referral.vue ProfileReferral.vue
mv Security.vue ProfileSecurity.vue
mv TelegramLink.vue ProfileTelegramLink.vue
```

**Step 2: Проверить использования**

Использования в `app/pages/profile.vue` уже корректны:
- `<ProfileAvatar />` ✓
- `<ProfileAchievements />` ✓
- и т.д.

**Step 3: Commit**

```bash
git add app/components/profile/
git add -u
git commit -m "refactor(profile): add Profile prefix to component files"
```

---

## Task 7: Очистка и финальная проверка

**Step 1: Очистить кэш Nuxt**

```bash
rm -rf .nuxt
```

**Step 2: Запустить dev сервер**

```bash
pnpm dev
```

**Step 3: Проверить консоль на ошибки**

Ожидаемый результат: нет ошибок "component not found"

**Step 4: Протестировать страницы**

- `/` - главная
- `/dashboard` - дашборд
- `/profile` - профиль
- `/login` - логин
- `/community` - сообщество

**Step 5: Финальный коммит (если были дополнительные исправления)**

```bash
git add .
git commit -m "fix: resolve any remaining component naming issues"
```

---

## Task 8: Обновить CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Добавить правило именования**

Добавить в секцию "Architecture" или создать новую секцию:

```markdown
## Component Naming Convention

**Правило:** Имя папки = префикс компонента

```
components/{folder}/{Folder}{Name}.vue → <FolderName />
```

**Примеры:**
- `ui/UiButton.vue` → `<UiButton />`
- `profile/ProfileAvatar.vue` → `<ProfileAvatar />`
- `dashboard/DashboardBalanceCard.vue` → `<DashboardBalanceCard />`
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add component naming convention to CLAUDE.md"
```

---

## Summary

| Папка | Файлов | Использований для обновления |
|-------|--------|------------------------------|
| ui/ | 8 | ~89 |
| layout/ | 2 | ~2 |
| dashboard/ | 4 | 0 (уже верно) |
| connection/ | 2 | ~2 |
| news/ | 1 | ~1 |
| profile/ | 10 | 0 (уже верно) |
| **Итого** | **27** | **~94** |
