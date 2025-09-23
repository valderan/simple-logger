#!/usr/bin/env bash
# Add an IP address to the whitelist.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"

curl -sS -X POST "${BASE_URL}/settings/whitelist" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"ip": "192.168.0.10", "description": "VPN gateway"}' | jq
