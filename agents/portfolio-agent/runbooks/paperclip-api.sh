#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
usage: paperclip-api.sh METHOD /api/path [json-body]

Examples:
  runbooks/paperclip-api.sh GET /api/agents/me
  runbooks/paperclip-api.sh POST /api/issues/123/comments '{"body":"ok"}'
EOF
  exit 1
}

method="${1:-}"
path="${2:-}"
body="${3:-}"

if [[ -z "$method" || -z "$path" ]]; then
  usage
fi

api_url="${PAPERCLIP_API_URL:-http://127.0.0.1:3100}"
key_file="${PAPERCLIP_API_KEY_FILE:-$HOME/.openclaw/workspace/paperclip-claimed-api-key.json}"
token="${PAPERCLIP_API_KEY:-}"

if [[ -z "$token" && -f "$key_file" ]]; then
  token="$(jq -r '.token // .apiKey // .key // empty' "$key_file")"
fi

if [[ -z "$token" || "$token" == "null" ]]; then
  echo "missing Paperclip API key; set PAPERCLIP_API_KEY or provide $key_file" >&2
  exit 1
fi

headers=(
  -H "Authorization: Bearer $token"
)

if [[ "$method" != "GET" && -n "${PAPERCLIP_RUN_ID:-}" ]]; then
  headers+=(-H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID")
fi

if [[ -n "$body" ]]; then
  headers+=(
    -H "Content-Type: application/json"
    --data "$body"
  )
fi

curl -fsS -X "$method" "${headers[@]}" "${api_url%/}${path}"
