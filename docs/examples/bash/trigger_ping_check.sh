#!/usr/bin/env bash
# Trigger immediate execution of all ping services in the project.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"
PROJECT_UUID="<project-uuid>"

curl -sS -X POST "${BASE_URL}/projects/${PROJECT_UUID}/ping-services/check" \
  -H "Authorization: Bearer ${TOKEN}" | jq
