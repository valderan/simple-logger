#!/usr/bin/env bash
# Register a ping service for periodic uptime monitoring.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project-uuid>"

curl -sS -X POST "${BASE_URL}/projects/${PROJECT_UUID}/ping-services" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
        "name": "Billing health-check",
        "url": "https://billing.example.com/health",
        "interval": 60,
        "telegramTags": ["PING_DOWN"]
      }' | jq
