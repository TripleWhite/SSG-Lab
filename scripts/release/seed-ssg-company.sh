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
PROJECT_NAME="${PROJECT_NAME:-SSG Lab}"
SOURCING_RESULTS_PARENT_TITLE="${SOURCING_RESULTS_PARENT_TITLE:-Sourcing Results}"
MATCHING_RESULTS_PARENT_TITLE="${MATCHING_RESULTS_PARENT_TITLE:-Matching Results}"
OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-ws://127.0.0.1:18789}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN must be set — run bootstrap-paperclip-host.sh first or export it}"
PAPERCLIP_PUBLIC_BASE_URL="${PAPERCLIP_PUBLIC_BASE_URL:-http://127.0.0.1:3100}"
OPENCLAW_ENV_FILE="${OPENCLAW_ENV_FILE:-${REMOTE_HOME}/.openclaw/.env}"

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

refresh_projects_json() {
  projects_json="$(curl_json GET "${PAPERCLIP_API_URL}/api/companies/${company_id}/projects")"
}

refresh_project_issues_json() {
  local project_id="$1"
  project_issues_json="$(curl_json GET "${PAPERCLIP_API_URL}/api/companies/${company_id}/issues?projectId=${project_id}")"
}

ensure_project_issue() {
  local project_id="$1"
  local title="$2"
  local description="$3"
  local existing_issue=""
  local issue_id=""

  refresh_project_issues_json "$project_id"
  existing_issue="$(jq -c --arg projectId "$project_id" --arg title "$title" '
    .[]
    | select(.projectId == $projectId)
    | select(.parentId == null)
    | select(.title == $title)
  ' <<<"$project_issues_json" | head -n 1)"

  if [[ -n "$existing_issue" ]]; then
    jq -r '.id' <<<"$existing_issue"
    return 0
  fi

  issue_id="$(curl_json POST "${PAPERCLIP_API_URL}/api/companies/${company_id}/issues" "$(jq -n \
    --arg projectId "$project_id" \
    --arg title "$title" \
    --arg description "$description" \
    '{
      projectId: $projectId,
      title: $title,
      description: $description,
      status: "done"
    }')" | jq -r '.id')"

  refresh_project_issues_json "$project_id"
  printf '%s\n' "$issue_id"
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"

  mkdir -p "$(dirname "$file")"

  python3 - "$file" "$key" "$value" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
needle = f"{key}="
lines = path.read_text().splitlines() if path.exists() else []
written = False
output = []

for line in lines:
    if line.startswith(needle):
        if not written:
            output.append(f"{key}={value}")
            written = True
        continue
    output.append(line)

if not written:
    output.append(f"{key}={value}")

path.write_text("\n".join(output).rstrip("\n") + "\n")
PY

  chmod 600 "$file" 2>/dev/null || true
}

desired_agent_payload() {
  local name="$1"
  local role="$2"
  local title="$3"
  local icon="$4"
  local capabilities="$5"
  local interval_sec="$6"
  local payload_message="${7:-}"
  local session_key="agent:${name}:main"

  jq -n \
    --arg name "$name" \
    --arg role "$role" \
    --arg title "$title" \
    --arg icon "$icon" \
    --arg capabilities "$capabilities" \
    --arg sessionKey "$session_key" \
    --arg url "$OPENCLAW_GATEWAY_URL" \
    --arg token "$OPENCLAW_GATEWAY_TOKEN" \
    --arg apiUrl "$PAPERCLIP_PUBLIC_BASE_URL" \
    --argjson intervalSec "$interval_sec" \
    --arg payloadMessage "$payload_message" \
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
        agentId: $name,
        sessionKeyStrategy: "fixed",
        sessionKey: $sessionKey
      },
      runtimeConfig: {
        heartbeat: {
          enabled: ($intervalSec > 0),
          intervalSec: $intervalSec,
          wakeOnDemand: true,
          maxConcurrentRuns: 1
        }
      }
    }
    | if ($payloadMessage | length) > 0 then
        .adapterConfig.payloadTemplate = { message: $payloadMessage }
      else
        .
      end
    '
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
refresh_projects_json

project_id="$(jq -r --arg name "$PROJECT_NAME" '.[] | select(.name == $name) | .id' <<<"$projects_json" | head -n 1)"

if [[ -z "$project_id" ]]; then
  echo "Project not found: ${PROJECT_NAME}" >&2
  exit 1
fi

ensure_agent() {
  local name="$1"
  local role="$2"
  local title="$3"
  local icon="$4"
  local capabilities="$5"
  local interval_sec="$6"
  local payload_message="${7:-}"
  local existing_agent=""
  local desired_payload=""
  local patch_payload=""
  local agent_id=""

  desired_payload="$(desired_agent_payload "$name" "$role" "$title" "$icon" "$capabilities" "$interval_sec" "$payload_message")"
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

HEARTBEAT_OVERRIDE_MSG="IMPORTANT: You have a domain-specific HEARTBEAT.md in your system prompt. Follow HEARTBEAT.md as your primary execution procedure. The Paperclip coordination context below provides API credentials and task routing only — do NOT follow the generic workflow steps below; use your HEARTBEAT.md procedure instead."

ensure_agent "feishu-bot" "general" "Employee conversation gateway" "message-square" "Feishu intake, routing, acknowledgement." 0
ensure_agent "sourcing-agent" "researcher" "Founder sourcing" "search" "Founder discovery, web research, enrichment." 14400
# portfolio-agent is a product-side OpenClaw runtime dispatched by EC2-B system cron.
# Do not seed it into the local Paperclip control plane.
ensure_agent "matching-agent" "researcher" "Cross-project matching" "radar" "Relationship mapping, opportunity matching, signal detection." 1800 "$HEARTBEAT_OVERRIDE_MSG"

sourcing_parent_issue_id="$(ensure_project_issue \
  "$project_id" \
  "$SOURCING_RESULTS_PARENT_TITLE" \
  "Dashboard parent anchor for sourcing results mirrored from OpenClaw.")"
matching_parent_issue_id="$(ensure_project_issue \
  "$project_id" \
  "$MATCHING_RESULTS_PARENT_TITLE" \
  "Dashboard parent anchor for match results mirrored from OpenClaw.")"

upsert_env_var "$GATEWAY_ENV" "PAPERCLIP_COMPANY_ID" "$company_id"
upsert_env_var "$GATEWAY_ENV" "PAPERCLIP_SOURCING_PARENT_ISSUE_ID" "$sourcing_parent_issue_id"
upsert_env_var "$GATEWAY_ENV" "PAPERCLIP_MATCHING_PARENT_ISSUE_ID" "$matching_parent_issue_id"

upsert_env_var "$OPENCLAW_ENV_FILE" "PAPERCLIP_COMPANY_ID" "$company_id"
upsert_env_var "$OPENCLAW_ENV_FILE" "PAPERCLIP_SOURCING_PARENT_ISSUE_ID" "$sourcing_parent_issue_id"
upsert_env_var "$OPENCLAW_ENV_FILE" "PAPERCLIP_MATCHING_PARENT_ISSUE_ID" "$matching_parent_issue_id"

curl_json GET "${PAPERCLIP_API_URL}/api/companies/${company_id}" | jq '{id, name, description}'
jq '[.[] | {name, role, title, adapterType, agentId: .adapterConfig.agentId, heartbeat: .runtimeConfig.heartbeat}]' <<<"$agents_json"
jq -n \
  --arg projectId "$project_id" \
  --arg sourcingParentIssueId "$sourcing_parent_issue_id" \
  --arg matchingParentIssueId "$matching_parent_issue_id" \
  '{
    projectId: $projectId,
    sourcingParentIssueId: $sourcingParentIssueId,
    matchingParentIssueId: $matchingParentIssueId
  }'
