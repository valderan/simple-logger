#!/usr/bin/env bash
# Authenticate against the Simple Logger API and print the returned token.

set -euo pipefail

BASE_URL="http://localhost:3000/api"

curl -sS -X POST "${BASE_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "secret"}' | jq
