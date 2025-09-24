#!/usr/bin/env bash
# Delete a logging project and all related logs.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project uuid>"

curl -sS -X DELETE "${BASE_URL}/projects/${PROJECT_UUID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq
