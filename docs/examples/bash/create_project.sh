#!/usr/bin/env bash
# Create a new logging project. Requires administrator token.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"

curl -sS -X POST "${BASE_URL}/projects" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
        "name": "Orders Service",
        "description": "Handles order placement and payment flows",
        "logFormat": {"level": "string", "message": "string", "timestamp": "ISO8601"},
        "customTags": ["PAYMENT", "SHIPPING"],
        "telegramNotify": {
          "enabled": true,
          "recipients": [{"chatId": "123456", "tags": ["ERROR", "CRITICAL"]}],
          "antiSpamInterval": 30
        },
        "debugMode": false
      }' | jq
