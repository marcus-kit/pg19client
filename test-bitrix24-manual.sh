#!/bin/bash
# Ручной тест Bitrix24 Chat - выполните команды по порядку
# Замените ВАШ_WEBHOOK_URL и OPENLINE_ID на ваши значения

echo "=== Тест Bitrix24 Chat через Webhook ==="
echo ""
echo "Замените в командах:"
echo "  ВАШ_WEBHOOK_URL - ваш webhook URL (например: https://pg19.bitrix24.ru/rest/257514/mruteia44f6r9crk/)"
echo "  OPENLINE_ID - ID открытой линии (например: 38)"
echo ""

# Примеры команд для копирования:

echo "=== ШАГ 1: Проверка webhook ==="
echo 'curl "ВАШ_WEBHOOK_URLserver.time"'
echo ""

echo "=== ШАГ 2: Создание сессии (вариант 1 - CONFIG_ID как число) ==="
echo 'curl -X POST "ВАШ_WEBHOOK_URLimopenlines.session.start" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "CONFIG_ID": OPENLINE_ID,
    "USER_CODE": "test_user_123",
    "MODE": "input",
    "USER_NAME": "Тестовый Пользователь"
  }'"'"''
echo ""

echo "=== ШАГ 3: Создание сессии (вариант 2 - без MODE) ==="
echo 'curl -X POST "ВАШ_WEBHOOK_URLimopenlines.session.start" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "CONFIG_ID": OPENLINE_ID,
    "USER_CODE": "test_user_123",
    "USER_NAME": "Тестовый Пользователь"
  }'"'"''
echo ""

echo "=== ШАГ 4: Создание сессии (вариант 3 - USER_CODE с livechat) ==="
echo 'curl -X POST "ВАШ_WEBHOOK_URLimopenlines.session.start" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "CONFIG_ID": OPENLINE_ID,
    "USER_CODE": "livechat|OPENLINE_ID|test_user_123",
    "USER_NAME": "Тестовый Пользователь"
  }'"'"''
echo ""

echo "=== ШАГ 5: Отправка сообщения (после получения SESSION_ID) ==="
echo 'curl -X POST "ВАШ_WEBHOOK_URLimopenlines.message.add" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "SESSION_ID": ВАШ_SESSION_ID,
    "MESSAGE": "Привет! Это тестовое сообщение."
  }'"'"''
echo ""

echo "=== ШАГ 6: Получение сообщений ==="
echo 'curl -X POST "ВАШ_WEBHOOK_URLimopenlines.session.history.get" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "SESSION_ID": ВАШ_SESSION_ID
  }'"'"''
echo ""
