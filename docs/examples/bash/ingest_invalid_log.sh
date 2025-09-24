#!/usr/bin/env bash
# Пример отправки лога с ошибочным форматом. Сервер вернёт 400 и запишет событие в системный проект.

API_URL="${API_URL:-http://localhost:3000}"  # базовый URL API
PROJECT_UUID="${PROJECT_UUID:-00000000-0000-0000-0000-000000000000}" # UUID проекта

curl -sS \
  -X POST "${API_URL}/api/logs" \
  -H 'Content-Type: application/json' \
  -d "{\"uuid\":\"${PROJECT_UUID}\",\"log\":{\"level\":\"INFO\"}}"
