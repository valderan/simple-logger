#!/usr/bin/env bash
# Remove an IP address from the whitelist.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"

curl -sS -X DELETE "${BASE_URL}/settings/whitelist/192.168.0.10" \
  -H "Authorization: Bearer ${TOKEN}" | jq
