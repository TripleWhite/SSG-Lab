#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_USER="${REMOTE_USER:-ec2-user}"
REMOTE_HOME="${REMOTE_HOME:-/home/${REMOTE_USER}}"
OPENCLAW_REPO_URL="${OPENCLAW_REPO_URL:-https://github.com/openclaw/openclaw.git}"
OPENCLAW_REPO_REF="${OPENCLAW_REPO_REF:-main}"

if [[ "$OPENCLAW_REPO_REF" == "main" || "$OPENCLAW_REPO_REF" == "master" ]]; then
  echo "WARNING: deploying OpenClaw from moving ref '${OPENCLAW_REPO_REF}' — reruns are non-reproducible." >&2
  echo "For audited rollouts, set OPENCLAW_REPO_REF to a tag or commit SHA." >&2
fi
OPENCLAW_SRC_DIR="${OPENCLAW_SRC_DIR:-${REMOTE_HOME}/openclaw-src}"
OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-${REMOTE_HOME}/.openclaw}"
OPENCLAW_ENV_FILE="${OPENCLAW_ENV_FILE:-${OPENCLAW_STATE_DIR}/.env}"
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR}/openclaw.json}"
OPENCLAW_PORT="${OPENCLAW_PORT:-18789}"
OPENCLAW_WORKSPACE_ROOT="${OPENCLAW_WORKSPACE_ROOT:-${REMOTE_HOME}/openclaw-agents}"
OPENCLAW_SERVICE_NAME="${OPENCLAW_SERVICE_NAME:-openclaw-gateway}"
AGENT_SOURCE_ROOT="${AGENT_SOURCE_ROOT:-}"
MEMORY_MIMIR_SOURCE_DIR="${MEMORY_MIMIR_SOURCE_DIR:-}"
MIMIR_URL="${MIMIR_URL:-https://api.allinmimir.com}"
FEISHU_APP_ID="${FEISHU_APP_ID:-}"
FEISHU_APP_SECRET="${FEISHU_APP_SECRET:-}"
FEISHU_VERIFICATION_TOKEN="${FEISHU_VERIFICATION_TOKEN:-}"
FEISHU_ENCRYPT_KEY="${FEISHU_ENCRYPT_KEY:-}"
MIMIR_API_KEY="${MIMIR_API_KEY:-}"
PAPERCLIP_API_URL="${PAPERCLIP_API_URL:-https://board.ssgaccelerator.com}"
PAPERCLIP_API_KEY="${PAPERCLIP_API_KEY:-}"
PAPERCLIP_COMPANY_ID="${PAPERCLIP_COMPANY_ID:-}"
PAPERCLIP_SOURCING_PARENT_ISSUE_ID="${PAPERCLIP_SOURCING_PARENT_ISSUE_ID:-}"
PAPERCLIP_MATCHING_PARENT_ISSUE_ID="${PAPERCLIP_MATCHING_PARENT_ISSUE_ID:-}"

pkg_install() {
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y "$@"
  else
    sudo yum install -y "$@"
  fi
}

require_env() {
  local name=""
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      echo "missing required env: ${name}" >&2
      exit 1
    fi
  done
}

ensure_node() {
  if command -v node >/dev/null 2>&1 && node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 16) ? 0 : 1);'; then
    return 0
  fi

  curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
  pkg_install nodejs
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if command -v corepack >/dev/null 2>&1; then
    corepack enable || true
    corepack prepare pnpm@latest --activate || true
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    sudo npm install -g pnpm
  fi
}

load_existing_env_value() {
  local file="$1"
  local key="$2"

  python3 - "$file" "$key" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
key = sys.argv[2]

if not path.exists():
    raise SystemExit(0)

for line in path.read_text().splitlines():
    if line.startswith(f"{key}="):
        print(line.split("=", 1)[1])
        raise SystemExit(0)
PY
}

write_state_env() {
  mkdir -p "$OPENCLAW_STATE_DIR"

  if [[ -z "$PAPERCLIP_SOURCING_PARENT_ISSUE_ID" ]]; then
    PAPERCLIP_SOURCING_PARENT_ISSUE_ID="$(
      load_existing_env_value "$OPENCLAW_ENV_FILE" "PAPERCLIP_SOURCING_PARENT_ISSUE_ID" || true
    )"
  fi

  if [[ -z "$PAPERCLIP_MATCHING_PARENT_ISSUE_ID" ]]; then
    PAPERCLIP_MATCHING_PARENT_ISSUE_ID="$(
      load_existing_env_value "$OPENCLAW_ENV_FILE" "PAPERCLIP_MATCHING_PARENT_ISSUE_ID" || true
    )"
  fi

  {
    printf 'OPENCLAW_GATEWAY_TOKEN=%s\n' "$OPENCLAW_GATEWAY_TOKEN"
    printf 'KIMI_API_KEY=%s\n' "$KIMI_API_KEY"

    if [[ -n "$MINIMAX_API_KEY" ]]; then
      printf 'MINIMAX_API_KEY=%s\n' "$MINIMAX_API_KEY"
    fi

    if [[ -n "$MIMIR_API_KEY" ]]; then
      printf 'MIMIR_API_KEY=%s\n' "$MIMIR_API_KEY"
      printf 'MIMIR_URL=%s\n' "$MIMIR_URL"
    fi

    if [[ -n "$FEISHU_APP_ID" ]]; then
      printf 'FEISHU_APP_ID=%s\n' "$FEISHU_APP_ID"
      printf 'FEISHU_APP_SECRET=%s\n' "$FEISHU_APP_SECRET"
    fi

    if [[ -n "$FEISHU_VERIFICATION_TOKEN" ]]; then
      printf 'FEISHU_VERIFICATION_TOKEN=%s\n' "$FEISHU_VERIFICATION_TOKEN"
      printf 'FEISHU_ENCRYPT_KEY=%s\n' "$FEISHU_ENCRYPT_KEY"
    fi

    printf 'PAPERCLIP_API_URL=%s\n' "$PAPERCLIP_API_URL"

    if [[ -n "$PAPERCLIP_API_KEY" ]]; then
      printf 'PAPERCLIP_API_KEY=%s\n' "$PAPERCLIP_API_KEY"
    fi

    if [[ -n "$PAPERCLIP_COMPANY_ID" ]]; then
      printf 'PAPERCLIP_COMPANY_ID=%s\n' "$PAPERCLIP_COMPANY_ID"
    fi

    if [[ -n "$PAPERCLIP_SOURCING_PARENT_ISSUE_ID" ]]; then
      printf 'PAPERCLIP_SOURCING_PARENT_ISSUE_ID=%s\n' "$PAPERCLIP_SOURCING_PARENT_ISSUE_ID"
    fi

    if [[ -n "$PAPERCLIP_MATCHING_PARENT_ISSUE_ID" ]]; then
      printf 'PAPERCLIP_MATCHING_PARENT_ISSUE_ID=%s\n' "$PAPERCLIP_MATCHING_PARENT_ISSUE_ID"
    fi
  } >"$OPENCLAW_ENV_FILE"

  chmod 600 "$OPENCLAW_ENV_FILE"
}

sync_agent_assets() {
  local agent_id=""
  mkdir -p "$OPENCLAW_WORKSPACE_ROOT" "${OPENCLAW_STATE_DIR}/agents"

  for agent_id in feishu-bot sourcing-agent portfolio-agent matching-agent; do
    mkdir -p \
      "${OPENCLAW_WORKSPACE_ROOT}/${agent_id}" \
      "${OPENCLAW_STATE_DIR}/agents/${agent_id}/agent"

    if [[ -n "$AGENT_SOURCE_ROOT" && -d "${AGENT_SOURCE_ROOT}/${agent_id}" ]]; then
      cp -a "${AGENT_SOURCE_ROOT}/${agent_id}/." "${OPENCLAW_WORKSPACE_ROOT}/${agent_id}/"
    fi
  done
}

install_openclaw_source() {
  if [[ ! -d "${OPENCLAW_SRC_DIR}/.git" ]]; then
    rm -rf "$OPENCLAW_SRC_DIR"
    # Keep initial clone shallow, then fetch the requested ref explicitly so
    # branch names, tags, and pinned commit SHAs all work on first deploy.
    git clone --depth 1 --no-checkout "$OPENCLAW_REPO_URL" "$OPENCLAW_SRC_DIR"
  fi

  git -C "$OPENCLAW_SRC_DIR" remote set-url origin "$OPENCLAW_REPO_URL"
  git -C "$OPENCLAW_SRC_DIR" fetch --depth 1 origin "$OPENCLAW_REPO_REF"
  git -C "$OPENCLAW_SRC_DIR" checkout --force FETCH_HEAD

  ensure_pnpm

  (
    cd "$OPENCLAW_SRC_DIR"
    pnpm install --frozen-lockfile || pnpm install
    pnpm ui:build
    pnpm build
  )
}

build_memory_plugin() {
  if [[ -z "$MEMORY_MIMIR_SOURCE_DIR" || ! -d "$MEMORY_MIMIR_SOURCE_DIR" ]]; then
    return 0
  fi

  (
    cd "$MEMORY_MIMIR_SOURCE_DIR"
    rm -rf node_modules
    npm install
    npm run build
  )
}

write_openclaw_config() {
  mkdir -p "$OPENCLAW_STATE_DIR"

  jq -n \
    --arg port "$OPENCLAW_PORT" \
    --arg workspaceRoot "$OPENCLAW_WORKSPACE_ROOT" \
    --arg stateDir "$OPENCLAW_STATE_DIR" \
    --arg memoryPath "$MEMORY_MIMIR_SOURCE_DIR" \
    --arg hasFeishuAppId "$FEISHU_APP_ID" \
    --arg hasFeishuAppSecret "$FEISHU_APP_SECRET" \
    --arg hasFeishuVerificationToken "$FEISHU_VERIFICATION_TOKEN" \
    --arg hasFeishuEncryptKey "$FEISHU_ENCRYPT_KEY" \
    --arg hasMinimax "$MINIMAX_API_KEY" \
    '{
      session: {
        dmScope: "per-channel-peer"
      },
      gateway: {
        mode: "local",
        port: ($port | tonumber),
        bind: "loopback",
        auth: {
          mode: "token",
          token: "${OPENCLAW_GATEWAY_TOKEN}",
          allowTailscale: false
        },
        controlUi: {
          enabled: true,
          basePath: "/openclaw"
        }
      },
      agents: {
        defaults: {
          model: {
            primary: "kimi-coding/k2p5"
          },
          models: {
            "kimi-coding/k2p5": {
              alias: "Kimi K2.5"
            }
          }
        },
        list: [
          {
            id: "feishu-bot",
            default: true,
            workspace: ($workspaceRoot + "/feishu-bot"),
            agentDir: ($stateDir + "/agents/feishu-bot/agent"),
            model: "kimi-coding/k2p5"
          },
          {
            id: "sourcing-agent",
            workspace: ($workspaceRoot + "/sourcing-agent"),
            agentDir: ($stateDir + "/agents/sourcing-agent/agent"),
            model: "kimi-coding/k2p5"
          },
          {
            id: "portfolio-agent",
            workspace: ($workspaceRoot + "/portfolio-agent"),
            agentDir: ($stateDir + "/agents/portfolio-agent/agent"),
            model: "kimi-coding/k2p5"
          },
          {
            id: "matching-agent",
            workspace: ($workspaceRoot + "/matching-agent"),
            agentDir: ($stateDir + "/agents/matching-agent/agent"),
            model: "minimax/MiniMax-M2.7"
          }
        ]
      },
      models: {
        mode: "merge",
        providers: {
          "kimi-coding": {
            baseUrl: "https://api.kimi.com/coding/",
            apiKey: "${KIMI_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "k2p5",
                name: "Kimi for Coding",
                reasoning: true,
                input: ["text", "image"],
                cost: {
                  input: 0,
                  output: 0,
                  cacheRead: 0,
                  cacheWrite: 0
                },
                contextWindow: 262144,
                maxTokens: 32768
              }
            ]
          }
        }
      },
      plugins: (
        if ($memoryPath | length) > 0 then
          {
            enabled: true,
            load: {
              paths: [$memoryPath]
            },
            entries: {
              "memory-mimir": {
                enabled: true,
                config: {
                  apiKey: "${MIMIR_API_KEY}",
                  mimirUrl: "${MIMIR_URL}",
                  autoRecall: false,
                  autoCapture: false,
                  tools: true,
                  displayName: "SSG Accelerator"
                }
              },
              "matching-agent-tools": {
                enabled: true
              }
            },
            slots: {
              memory: "memory-mimir"
            }
          }
        else
          {
            enabled: true,
            entries: {
              "matching-agent-tools": {
                enabled: true
              }
            }
          }
        end
      )
    }
    | if ($hasMinimax | length) > 0 then
        .models.providers.minimax = {
          baseUrl: "https://api.minimaxi.com/anthropic",
          apiKey: "${MINIMAX_API_KEY}",
          api: "anthropic-messages",
          models: [
            {
              id: "MiniMax-M2.7",
              name: "MiniMax M2.7",
              reasoning: true,
              input: ["text"],
              cost: {
                input: 0.3,
                output: 1.2,
                cacheRead: 0.03,
                cacheWrite: 0.12
              },
              contextWindow: 200000,
              maxTokens: 8192
            }
          ]
        }
        | .agents.defaults.models."minimax/MiniMax-M2.7" = { alias: "Minimax" }
      else
        .
      end
    | if ($hasFeishuAppId | length) > 0 and ($hasFeishuAppSecret | length) > 0 then
        .channels = {
          feishu: {
            enabled: true,
            connectionMode: "websocket",
            dmPolicy: "pairing",
            groupPolicy: "open",
            requireMention: true,
            typingIndicator: false,
            accounts: {
              default: {
                appId: "${FEISHU_APP_ID}",
                appSecret: "${FEISHU_APP_SECRET}"
              }
            }
          }
        }
      else
        .
      end
    | if ($hasFeishuVerificationToken | length) > 0 and ($hasFeishuEncryptKey | length) > 0 then
        .channels.feishu.verificationToken = "${FEISHU_VERIFICATION_TOKEN}"
        | .channels.feishu.encryptKey = "${FEISHU_ENCRYPT_KEY}"
      else
        .
      end
    ' >"$OPENCLAW_CONFIG_PATH"
}

wait_for_gateway() {
  for _ in $(seq 1 30); do
    if sudo systemctl is-active --quiet "$OPENCLAW_SERVICE_NAME" \
      && curl -fsS "http://127.0.0.1:${OPENCLAW_PORT}/openclaw/" >/dev/null; then
      return 0
    fi
    sleep 2
  done

  return 1
}

install_systemd_service() {
  sudo tee "/etc/systemd/system/${OPENCLAW_SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=${REMOTE_USER}
WorkingDirectory=${OPENCLAW_SRC_DIR}
Environment=HOME=${REMOTE_HOME}
Environment=OPENCLAW_STATE_DIR=${OPENCLAW_STATE_DIR}
Environment=OPENCLAW_CONFIG_PATH=${OPENCLAW_CONFIG_PATH}
EnvironmentFile=-${OPENCLAW_ENV_FILE}
ExecStart=/usr/bin/env node ${OPENCLAW_SRC_DIR}/openclaw.mjs gateway --port ${OPENCLAW_PORT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable "$OPENCLAW_SERVICE_NAME"
  sudo systemctl restart "$OPENCLAW_SERVICE_NAME"
}

pkg_install git jq gcc-c++ make python3
ensure_node
require_env OPENCLAW_GATEWAY_TOKEN KIMI_API_KEY

if [[ -n "$FEISHU_APP_ID" || -n "$FEISHU_APP_SECRET" ]]; then
  require_env FEISHU_APP_ID FEISHU_APP_SECRET
fi

if [[ -n "$FEISHU_VERIFICATION_TOKEN" || -n "$FEISHU_ENCRYPT_KEY" ]]; then
  require_env FEISHU_VERIFICATION_TOKEN FEISHU_ENCRYPT_KEY
fi

if [[ -n "$MEMORY_MIMIR_SOURCE_DIR" ]]; then
  require_env MIMIR_API_KEY
fi

write_state_env
sync_agent_assets
install_openclaw_source
build_memory_plugin
write_openclaw_config

set -a
. "$OPENCLAW_ENV_FILE"
set +a

(
  cd "$OPENCLAW_SRC_DIR"
  OPENCLAW_STATE_DIR="$OPENCLAW_STATE_DIR" \
  OPENCLAW_CONFIG_PATH="$OPENCLAW_CONFIG_PATH" \
  node openclaw.mjs config validate --json
)

install_systemd_service
wait_for_gateway

REMOTE_USER="$REMOTE_USER" \
REMOTE_HOME="$REMOTE_HOME" \
OPENCLAW_STATE_DIR="$OPENCLAW_STATE_DIR" \
OPENCLAW_CONFIG_PATH="$OPENCLAW_CONFIG_PATH" \
OPENCLAW_NODE_BIN="$(command -v node)" \
OPENCLAW_MJS_PATH="${OPENCLAW_SRC_DIR}/openclaw.mjs" \
PORTFOLIO_AGENT_CRON_SCHEDULE="${PORTFOLIO_AGENT_CRON_SCHEDULE:-}" \
PORTFOLIO_AGENT_CRON_TZ="${PORTFOLIO_AGENT_CRON_TZ:-}" \
PORTFOLIO_AGENT_TIMEOUT="${PORTFOLIO_AGENT_TIMEOUT:-}" \
PORTFOLIO_AGENT_CRON_MESSAGE="${PORTFOLIO_AGENT_CRON_MESSAGE:-}" \
"${SCRIPT_DIR}/install-portfolio-agent-cron.sh"

jq -n \
  --arg service "$OPENCLAW_SERVICE_NAME" \
  --arg controlUi "http://127.0.0.1:${OPENCLAW_PORT}/openclaw/" \
  '{
    status: "ok",
    service: $service,
    controlUi: $controlUi
  }'
