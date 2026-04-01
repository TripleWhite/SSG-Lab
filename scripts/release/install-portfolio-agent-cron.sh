#!/usr/bin/env bash
set -euo pipefail

REMOTE_USER="${REMOTE_USER:-$(id -un)}"
REMOTE_HOME="${REMOTE_HOME:-/home/${REMOTE_USER}}"
OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-${REMOTE_HOME}/.openclaw}"
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${OPENCLAW_STATE_DIR}/openclaw.json}"
OPENCLAW_NODE_BIN="${OPENCLAW_NODE_BIN:-/usr/bin/node}"
OPENCLAW_MJS_PATH="${OPENCLAW_MJS_PATH:-${REMOTE_HOME}/.npm-global/lib/node_modules/openclaw/openclaw.mjs}"
CRON_FILE="${CRON_FILE:-/etc/cron.d/portfolio-agent}"
WRAPPER_PATH="${WRAPPER_PATH:-${OPENCLAW_STATE_DIR}/bin/run-portfolio-agent.sh}"
LOG_PATH="${LOG_PATH:-${OPENCLAW_STATE_DIR}/logs/portfolio-agent-cron.log}"
LOCK_PATH="${LOCK_PATH:-${OPENCLAW_STATE_DIR}/locks/portfolio-agent-cron.lock}"
PORTFOLIO_AGENT_ID="${PORTFOLIO_AGENT_ID:-portfolio-agent}"
PORTFOLIO_AGENT_CRON_SCHEDULE="${PORTFOLIO_AGENT_CRON_SCHEDULE:-0 9 * * *}"
PORTFOLIO_AGENT_CRON_TZ="${PORTFOLIO_AGENT_CRON_TZ:-UTC}"
PORTFOLIO_AGENT_TIMEOUT="${PORTFOLIO_AGENT_TIMEOUT:-1800}"
PORTFOLIO_AGENT_CRON_MESSAGE="${PORTFOLIO_AGENT_CRON_MESSAGE:-Scheduled 09:00 UTC portfolio scan. Follow HEARTBEAT.md for the full daily sweep across active portfolio projects. Treat this as the daily cron dispatch, scan the full portfolio, persist meaningful state changes, and send digests and urgent alerts as appropriate.}"

if [[ ! -x "$OPENCLAW_NODE_BIN" ]]; then
  echo "missing node binary: $OPENCLAW_NODE_BIN" >&2
  exit 1
fi

if [[ ! -f "$OPENCLAW_MJS_PATH" ]]; then
  echo "missing OpenClaw entrypoint: $OPENCLAW_MJS_PATH" >&2
  exit 1
fi

if [[ ! -f "$OPENCLAW_CONFIG_PATH" ]]; then
  echo "missing OpenClaw config: $OPENCLAW_CONFIG_PATH" >&2
  exit 1
fi

mkdir -p "$(dirname "$WRAPPER_PATH")" "$(dirname "$LOG_PATH")" "$(dirname "$LOCK_PATH")"
chown -R "$REMOTE_USER":"$REMOTE_USER" \
  "$(dirname "$WRAPPER_PATH")" \
  "$(dirname "$LOG_PATH")" \
  "$(dirname "$LOCK_PATH")"

cat >"$WRAPPER_PATH" <<EOF
#!/usr/bin/env bash
set -euo pipefail

umask 077

export HOME="${REMOTE_HOME}"
export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}"
export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}"
export PATH="${REMOTE_HOME}/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"

OPENCLAW_NODE_BIN="${OPENCLAW_NODE_BIN}"
OPENCLAW_MJS_PATH="${OPENCLAW_MJS_PATH}"
LOCK_PATH="${LOCK_PATH}"
PORTFOLIO_AGENT_ID="${PORTFOLIO_AGENT_ID}"
PORTFOLIO_AGENT_TIMEOUT_DEFAULT="${PORTFOLIO_AGENT_TIMEOUT}"

default_message="\$(cat <<'MSG'
${PORTFOLIO_AGENT_CRON_MESSAGE}
MSG
)"

mkdir -p "$(dirname "\$LOCK_PATH")" "$(dirname "${LOG_PATH}")"

if command -v flock >/dev/null 2>&1; then
  exec 9>"\$LOCK_PATH"
  if ! flock -n 9; then
    printf '%s portfolio-agent cron already running\n' "\$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    exit 0
  fi
fi

message="\${PORTFOLIO_AGENT_MESSAGE_OVERRIDE:-\$default_message}"
session_id="\${PORTFOLIO_AGENT_SESSION_ID_OVERRIDE:-agent:portfolio-agent:cron:\$(date -u '+%Y%m%dT%H%M%SZ')}"
timeout="\${PORTFOLIO_AGENT_TIMEOUT:-\${PORTFOLIO_AGENT_TIMEOUT_DEFAULT}}"

agent_cmd=(
  "\$OPENCLAW_NODE_BIN"
  "\$OPENCLAW_MJS_PATH"
  agent
  --agent
  "\$PORTFOLIO_AGENT_ID"
  --session-id
  "\$session_id"
  --message
  "\$message"
  --timeout
  "\$timeout"
  --json
)

printf '%s dispatch agent=%s session=%s\n' "\$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "\$PORTFOLIO_AGENT_ID" "\$session_id"
set +e
if command -v stdbuf >/dev/null 2>&1; then
  stdbuf -oL -eL "\${agent_cmd[@]}"
else
  "\${agent_cmd[@]}"
fi
status=\$?
set -e
printf '%s exit status=%s session=%s\n' "\$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "\$status" "\$session_id"
exit "\$status"
EOF

chmod 700 "$WRAPPER_PATH"
chown "$REMOTE_USER":"$REMOTE_USER" "$WRAPPER_PATH"
touch "$LOG_PATH"
chown "$REMOTE_USER":"$REMOTE_USER" "$LOG_PATH"
chmod 600 "$LOG_PATH"

sudo tee "$CRON_FILE" >/dev/null <<EOF
SHELL=/bin/bash
PATH=${REMOTE_HOME}/.npm-global/bin:/usr/local/bin:/usr/bin:/bin
CRON_TZ=${PORTFOLIO_AGENT_CRON_TZ}

${PORTFOLIO_AGENT_CRON_SCHEDULE} ${REMOTE_USER} ${WRAPPER_PATH} >> ${LOG_PATH} 2>&1
EOF

sudo chmod 644 "$CRON_FILE"
sudo systemctl reload cron 2>/dev/null || sudo systemctl reload crond 2>/dev/null || true

cat <<EOF
{"status":"ok","cronFile":"$CRON_FILE","wrapperPath":"$WRAPPER_PATH","logPath":"$LOG_PATH","schedule":"$PORTFOLIO_AGENT_CRON_SCHEDULE","timezone":"$PORTFOLIO_AGENT_CRON_TZ"}
EOF
