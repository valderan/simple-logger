#!/usr/bin/env bash
# Fetch logs for a specific project.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project-uuid>"

curl -sS "${BASE_URL}/projects/${PROJECT_UUID}/logs?level=ERROR&startDate=2024-05-01T00:00:00.000Z" \
  -H "Authorization: Bearer ${TOKEN}" | jq
