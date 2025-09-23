#!/usr/bin/env bash
# Filter logs with query parameters.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project-uuid>"

curl -sS "${BASE_URL}/logs?uuid=${PROJECT_UUID}&level=ERROR&text=payment" \
  -H "Authorization: Bearer ${TOKEN}" | jq
