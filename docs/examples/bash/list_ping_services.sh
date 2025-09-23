#!/usr/bin/env bash
# Display ping services associated with the project.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project-uuid>"

curl -sS "${BASE_URL}/projects/${PROJECT_UUID}/ping-services" \
  -H "Authorization: Bearer ${TOKEN}" | jq
