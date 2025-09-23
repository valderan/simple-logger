#!/usr/bin/env bash
# Show whitelist entries.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"

curl -sS "${BASE_URL}/settings/whitelist" \
  -H "Authorization: Bearer ${TOKEN}" | jq
