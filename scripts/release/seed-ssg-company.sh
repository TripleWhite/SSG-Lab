#!/usr/bin/env bash
set -euo pipefail

REMOTE_USER="${REMOTE_USER:-ec2-user}"
REMOTE_HOME="${REMOTE_HOME:-/home/${REMOTE_USER}}"

# Source the gateway env written by bootstrap-paperclip-host.sh so the
# token stays in sync without manual passing.
GATEWAY_ENV="${REMOTE_HOME}/openclaw-gateway.env"
if [[ -f "$GATEWAY_ENV" ]]; then
  set -a; . "$GATEWAY_ENV"; set +a
fi

PAPERCLIP_API_URL="${PAPERCLIP_API_URL:-http://127.0.0.1:3100}"
PAPERCLIP_API_KEY="${PAPERCLIP_API_KEY:-}"
COMPANY_NAME="${COMPANY_NAME:-SSG Accelerator}"
COMPANY_DESCRIPTION="${COMPANY_DESCRIPTION:-AI-powered investment accelerator}"
OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-ws://127.0.0.1:18789}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN must be set — run bootstrap-paperclip-host.sh first or export it}"
PAPERCLIP_PUBLIC_BASE_URL="${PAPERCLIP_PUBLIC_BASE_URL:-http://127.0.0.1:3100}"

curl_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    if [[ -n "$PAPERCLIP_API_KEY" ]]; then
      curl -fsS -X "$method" \
        -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
        -H "Content-Type: application/json" \
        "$url" \
        -d "$body"
    else
      curl -fsS -X "$method" \
        -H "Content-Type: application/json" \
        "$url" \
        -d "$body"
    fi
  else
    if [[ -n "$PAPERCLIP_API_KEY" ]]; then
      curl -fsS -H "Authorization: Bearer $PAPERCLIP_API_KEY" "$url"
    else
      curl -fsS "$url"
    fi
  fi
}

refresh_agents_json() {
  agents_json="$(curl_json GET "${PAPERCLIP_API_URL}/api/companies/${company_id}/agents")"
}

desired_agent_payload() {
  local name="$1"
  local role="$2"
  local title="$3"
  local icon="$4"
  local capabilities="$5"
  local interval_sec="$6"

  jq -n \
    --arg name "$name" \
    --arg role "$role" \
    --arg title "$title" \
    --arg icon "$icon" \
    --arg capabilities "$capabilities" \
    --arg url "$OPENCLAW_GATEWAY_URL" \
    --arg token "$OPENCLAW_GATEWAY_TOKEN" \
    --arg apiUrl "$PAPERCLIP_PUBLIC_BASE_URL" \
    --argjson intervalSec "$interval_sec" \
    '{
      name: $name,
      role: $role,
      title: $title,
      icon: $icon,
      capabilities: $capabilities,
      adapterType: "openclaw_gateway",
      adapterConfig: {
        url: $url,
        headers: {
          "x-openclaw-token": $token
        },
        paperclipApiUrl: $apiUrl,
        agentId: $name
      },
      runtimeConfig: {
        heartbeat: {
          enabled: ($intervalSec > 0),
          intervalSec: $intervalSec,
          wakeOnDemand: true,
          maxConcurrentRuns: 1
        }
      }
    }'
}

companies_json="$(curl_json GET "${PAPERCLIP_API_URL}/api/companies")"
company_id="$(jq -r --arg name "$COMPANY_NAME" '.[] | select(.name == $name) | .id' <<<"$companies_json" | head -n 1)"

if [[ -z "$company_id" ]]; then
  company_id="$(curl_json POST "${PAPERCLIP_API_URL}/api/companies" "$(jq -n \
    --arg name "$COMPANY_NAME" \
    --arg description "$COMPANY_DESCRIPTION" \
    '{name: $name, description: $description}')" | jq -r '.id')"
fi

refresh_agents_json

ensure_agent() {
  local name="$1"
  local role="$2"
  local title="$3"
  local icon="$4"
  local capabilities="$5"
  local interval_sec="$6"
  local existing_agent=""
  local desired_payload=""
  local patch_payload=""
  local agent_id=""

  desired_payload="$(desired_agent_payload "$name" "$role" "$title" "$icon" "$capabilities" "$interval_sec")"
  existing_agent="$(jq -c --arg name "$name" '.[] | select(.name == $name)' <<<"$agents_json" | head -n 1)"

  if [[ -z "$existing_agent" ]]; then
    curl_json POST "${PAPERCLIP_API_URL}/api/companies/${company_id}/agents" "$desired_payload" >/dev/null
    refresh_agents_json
    return 0
  fi

  agent_id="$(jq -r '.id' <<<"$existing_agent")"
  patch_payload="$(jq -cn \
    --argjson existing "$existing_agent" \
    --argjson desired "$desired_payload" \
    '{
      role: $desired.role,
      title: $desired.title,
      icon: $desired.icon,
      capabilities: $desired.capabilities,
      adapterType: $desired.adapterType,
      adapterConfig: (($existing.adapterConfig // {}) * ($desired.adapterConfig // {})),
      runtimeConfig: (($existing.runtimeConfig // {}) * ($desired.runtimeConfig // {}))
    }')"

  if jq -e --argjson payload "$patch_payload" '
    .role == $payload.role
    and .title == $payload.title
    and .icon == $payload.icon
    and .capabilities == $payload.capabilities
    and .adapterType == $payload.adapterType
    and ((.adapterConfig // {}) == ($payload.adapterConfig // {}))
    and ((.runtimeConfig // {}) == ($payload.runtimeConfig // {}))
  ' <<<"$existing_agent" >/dev/null; then
    return 0
  fi

  curl_json PATCH "${PAPERCLIP_API_URL}/api/agents/${agent_id}" "$patch_payload" >/dev/null
  refresh_agents_json
}

ensure_agent "feishu-bot" "general" "Employee conversation gateway" "message-square" "Feishu intake, routing, acknowledgement." 0
ensure_agent "sourcing-agent" "researcher" "Founder sourcing" "search" "Founder discovery, web research, enrichment." 14400
ensure_agent "portfolio-agent" "pm" "Portfolio follow-up" "target" "Portfolio review, daily prioritization, follow-up planning." 86400
ensure_agent "matching-agent" "researcher" "Cross-project matching" "radar" "Relationship mapping, opportunity matching, signal detection." 1800

curl_json GET "${PAPERCLIP_API_URL}/api/companies/${company_id}" | jq '{id, name, description}'
jq '[.[] | {name, role, title, adapterType, agentId: .adapterConfig.agentId, heartbeat: .runtimeConfig.heartbeat}]' <<<"$agents_json"
