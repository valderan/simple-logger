#!/usr/bin/env bash
# Update an existing logging project. Requires administrator token.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project uuid>"

curl -sS -X PUT "${BASE_URL}/projects/${PROJECT_UUID}" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
        "name": "Orders Service",
        "description": "Updated description with SLA requirements",
        "logFormat": {"level": "string", "message": "string", "timestamp": "ISO8601"},
        "defaultTags": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        "customTags": ["PAYMENT", "SHIPPING"],
        "accessLevel": "global",
        "telegramNotify": {
          "enabled": true,
          "recipients": [{"chatId": "123456", "tags": ["ERROR", "CRITICAL"]}],
          "antiSpamInterval": 20
        },
        "debugMode": false,
        "maxLogEntries": 0
      }' | jq
