#!/usr/bin/env bash
# Send an application log entry to the collector.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
PROJECT_UUID="<project-uuid>"

curl -sS -X POST "${BASE_URL}/logs" \
  -H 'Content-Type: application/json' \
  -d '{
        "uuid": "'"${PROJECT_UUID}"'",
        "log": {
          "level": "ERROR",
          "message": "Payment gateway returned non-200 response",
          "tags": ["PAYMENT"],
          "metadata": {
            "service": "billing-service",
            "user": "user-42",
            "ip": "10.0.0.12",
            "extra": {"orderId": "A-42"}
          }
        }
      }' | jq
