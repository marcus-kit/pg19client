#!/bin/bash
# Тестовый скрипт для проверки работы Bitrix24 чата через webhook

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Тест Bitrix24 Chat через Webhook ===${NC}\n"

# Читаем переменные из .env
if [ ! -f .env ]; then
    echo -e "${RED}Ошибка: файл .env не найден${NC}"
    exit 1
fi

WEBHOOK_URL=$(grep BITRIX24_WEBHOOK_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
OPENLINE_ID=$(grep BITRIX24_OPENLINE_ID .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${RED}Ошибка: BITRIX24_WEBHOOK_URL не найден в .env${NC}"
    exit 1
fi

if [ -z "$OPENLINE_ID" ]; then
    echo -e "${YELLOW}Предупреждение: BITRIX24_OPENLINE_ID не найден, используем 38${NC}"
    OPENLINE_ID=38
fi

# Убеждаемся, что URL заканчивается на /
if [[ ! "$WEBHOOK_URL" =~ /$ ]]; then
    WEBHOOK_URL="${WEBHOOK_URL}/"
fi

echo -e "${GREEN}Webhook URL:${NC} ${WEBHOOK_URL}"
echo -e "${GREEN}OpenLine ID:${NC} ${OPENLINE_ID}\n"

# Шаг 1: Проверка доступности webhook
echo -e "${YELLOW}Шаг 1: Проверка доступности webhook...${NC}"
TEST_RESPONSE=$(curl -s "${WEBHOOK_URL}server.time")
echo "Ответ: $TEST_RESPONSE"
if echo "$TEST_RESPONSE" | grep -q "result"; then
    echo -e "${GREEN}✓ Webhook доступен${NC}\n"
else
    echo -e "${RED}✗ Webhook недоступен или неверный${NC}"
    exit 1
fi

# Шаг 2: Создание сессии
echo -e "${YELLOW}Шаг 2: Создание сессии Open Lines...${NC}"
USER_ID="test_user_$(date +%s)"
USER_NAME="Тестовый Пользователь"

# Пробуем разные форматы
echo -e "\n${YELLOW}Вариант 1: CONFIG_ID как число, USER_CODE простой${NC}"
SESSION_RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}imopenlines.session.start" \
  -H "Content-Type: application/json" \
  -d "{
    \"CONFIG_ID\": ${OPENLINE_ID},
    \"USER_CODE\": \"${USER_ID}\",
    \"MODE\": \"input\",
    \"USER_NAME\": \"${USER_NAME}\"
  }")

echo "Ответ: $SESSION_RESPONSE"

# Проверяем, есть ли SESSION_ID
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"SESSION_ID"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -z "$SESSION_ID" ]; then
    echo -e "${YELLOW}Вариант 1 не сработал, пробуем вариант 2...${NC}"
    SESSION_RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}imopenlines.session.start" \
      -H "Content-Type: application/json" \
      -d "{
        \"CONFIG_ID\": ${OPENLINE_ID},
        \"USER_CODE\": \"livechat|${OPENLINE_ID}|${USER_ID}\",
        \"MODE\": \"input\",
        \"USER_NAME\": \"${USER_NAME}\"
      }")
    echo "Ответ: $SESSION_RESPONSE"
    SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"SESSION_ID"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' | head -1)
fi

if [ -z "$SESSION_ID" ]; then
    echo -e "${YELLOW}Вариант 2 не сработал, пробуем вариант 3 (без MODE)...${NC}"
    SESSION_RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}imopenlines.session.start" \
      -H "Content-Type: application/json" \
      -d "{
        \"CONFIG_ID\": ${OPENLINE_ID},
        \"USER_CODE\": \"${USER_ID}\",
        \"USER_NAME\": \"${USER_NAME}\"
      }")
    echo "Ответ: $SESSION_RESPONSE"
    SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"SESSION_ID"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' | head -1)
fi

if [ -z "$SESSION_ID" ]; then
    echo -e "${RED}✗ Не удалось создать сессию${NC}"
    echo -e "${RED}Полный ответ:${NC}"
    echo "$SESSION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SESSION_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Сессия создана, SESSION_ID: ${SESSION_ID}${NC}\n"

# Шаг 3: Отправка сообщения
echo -e "${YELLOW}Шаг 3: Отправка сообщения в чат...${NC}"
MESSAGE="Привет! Это тестовое сообщение от пользователя."

echo -e "\n${YELLOW}Вариант 1: imopenlines.message.add${NC}"
SEND_RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}imopenlines.message.add" \
  -H "Content-Type: application/json" \
  -d "{
    \"SESSION_ID\": ${SESSION_ID},
    \"MESSAGE\": \"${MESSAGE}\"
  }")

echo "Ответ: $SEND_RESPONSE"

# Проверяем успешность
if echo "$SEND_RESPONSE" | grep -q "result"; then
    echo -e "${GREEN}✓ Сообщение отправлено через imopenlines.message.add${NC}\n"
else
    echo -e "${YELLOW}Вариант 1 не сработал, пробуем вариант 2: im.message.add${NC}"
    
    # Пробуем через im.message.add с DIALOG_ID
    DIALOG_ID="livechat|${OPENLINE_ID}|${SESSION_ID}"
    SEND_RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}im.message.add" \
      -H "Content-Type: application/json" \
      -d "{
        \"DIALOG_ID\": \"${DIALOG_ID}\",
        \"MESSAGE\": \"${MESSAGE}\"
      }")
    
    echo "Ответ: $SEND_RESPONSE"
    
    if echo "$SEND_RESPONSE" | grep -q "result"; then
        echo -e "${GREEN}✓ Сообщение отправлено через im.message.add${NC}\n"
    else
        echo -e "${RED}✗ Не удалось отправить сообщение${NC}"
        echo -e "${RED}Полный ответ:${NC}"
        echo "$SEND_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SEND_RESPONSE"
    fi
fi

# Шаг 4: Получение сообщений
echo -e "${YELLOW}Шаг 4: Получение сообщений из чата...${NC}"
MESSAGES_RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}imopenlines.session.history.get" \
  -H "Content-Type: application/json" \
  -d "{
    \"SESSION_ID\": ${SESSION_ID}
  }")

echo "Ответ: $MESSAGES_RESPONSE"

if echo "$MESSAGES_RESPONSE" | grep -q "result"; then
    echo -e "${GREEN}✓ Сообщения получены${NC}\n"
else
    echo -e "${YELLOW}Пробуем альтернативный метод: im.dialog.messages.get${NC}"
    DIALOG_ID="chat${SESSION_ID}"
    MESSAGES_RESPONSE=$(curl -s -X POST "${WEBHOOK_URL}im.dialog.messages.get" \
      -H "Content-Type: application/json" \
      -d "{
        \"DIALOG_ID\": \"${DIALOG_ID}\",
        \"LIMIT\": 50
      }")
    echo "Ответ: $MESSAGES_RESPONSE"
fi

echo -e "\n${GREEN}=== Тест завершен ===${NC}"
echo -e "${YELLOW}SESSION_ID для дальнейших тестов: ${SESSION_ID}${NC}"
