#!/usr/bin/env bash
# Delete logs matching the provided filter.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project-uuid>"

curl -sS -X DELETE "${BASE_URL}/logs/${PROJECT_UUID}?level=DEBUG" \
  -H "Authorization: Bearer ${TOKEN}" | jq
