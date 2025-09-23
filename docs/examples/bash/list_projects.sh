#!/usr/bin/env bash
# List all projects. Requires administrator token.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"

curl -sS "${BASE_URL}/projects" \
  -H "Authorization: Bearer ${TOKEN}" | jq
