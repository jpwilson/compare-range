#!/bin/zsh
# Runs supabase/migrations/20260901T00_user_vehicles.sql against the evlineup
# Supabase project via the Management API, using the Supabase CLI's stored login.
set -euo pipefail
cd "$(dirname "$0")/.."
TOKEN=$(security find-generic-password -s "Supabase CLI" -w)
# go-keyring sometimes base64-wraps stored secrets.
if [[ $TOKEN == go-keyring-base64:* ]]; then
  TOKEN=$(printf %s "${TOKEN#go-keyring-base64:}" | base64 -D)
fi
echo "token shape: ${TOKEN:0:4}… (${#TOKEN} chars)"   # sbp_ = personal access token, the right kind
curl -sS "https://api.supabase.com/v1/projects" -H "Authorization: Bearer $TOKEN" -o /dev/null -w "auth check: HTTP %{http_code}\n"
PAYLOAD=$(mktemp)
python3 -c 'import json; open("'"$PAYLOAD"'","w").write(json.dumps({"query": open("supabase/migrations/20260901T00_user_vehicles.sql").read()}))'
curl -sS -X POST "https://api.supabase.com/v1/projects/mesvpswjkqqogdoscyxx/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data @"$PAYLOAD" \
  -w "\nHTTP %{http_code}\n"
rm -f "$PAYLOAD"
