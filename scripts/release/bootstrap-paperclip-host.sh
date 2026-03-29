#!/usr/bin/env bash
set -euo pipefail

REMOTE_USER="${REMOTE_USER:-ec2-user}"
REMOTE_HOME="${REMOTE_HOME:-/home/${REMOTE_USER}}"
DEPLOY_ROOT="${DEPLOY_ROOT:-${REMOTE_HOME}/paperclip-app}"
PAPERCLIP_HOME_DIR="${PAPERCLIP_HOME_DIR:-${REMOTE_HOME}/.paperclip}"
PAPERCLIP_VERSION="${PAPERCLIP_VERSION:-2026.325.0}"
PAPERCLIP_HOST="${PAPERCLIP_HOST:-127.0.0.1}"
PAPERCLIP_PORT="${PAPERCLIP_PORT:-3100}"
PAPERCLIP_DEPLOYMENT_MODE="${PAPERCLIP_DEPLOYMENT_MODE:-local_trusted}"
PAPERCLIP_DEPLOYMENT_EXPOSURE="${PAPERCLIP_DEPLOYMENT_EXPOSURE:-private}"
PAPERCLIP_PUBLIC_URL="${PAPERCLIP_PUBLIC_URL:-}"
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-}"
PAPERCLIP_AGENT_JWT_SECRET="${PAPERCLIP_AGENT_JWT_SECRET:-$(openssl rand -hex 32)}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-$(openssl rand -hex 24)}"
CADDY_DOMAIN="${CADDY_DOMAIN:-board.ssgaccelerator.com}"
INSTALL_CADDY="${INSTALL_CADDY:-true}"

pkg_update() {
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf update -y
  else
    sudo yum update -y
  fi
}

pkg_install() {
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y "$@"
  else
    sudo yum install -y "$@"
  fi
}

caddy_arch() {
  case "$(uname -m)" in
    x86_64|amd64)
      echo "amd64"
      ;;
    aarch64|arm64)
      echo "arm64"
      ;;
    *)
      return 1
      ;;
  esac
}

install_caddy_from_binary() {
  local arch=""
  local asset_url=""
  local tmpdir=""
  local archive_path=""

  arch="$(caddy_arch)" || return 1
  asset_url="$(
    curl -fsSL https://api.github.com/repos/caddyserver/caddy/releases/latest \
      | jq -r --arg arch "$arch" '
          .assets[]
          | select(.name | test("^caddy_[0-9.]+_linux_" + $arch + "\\.tar\\.gz$"))
          | .browser_download_url
        ' \
      | head -n 1
  )"

  if [[ -z "$asset_url" || "$asset_url" == "null" ]]; then
    return 1
  fi

  tmpdir="$(mktemp -d)"
  archive_path="${tmpdir}/caddy.tar.gz"

  curl -fsSL "$asset_url" -o "$archive_path"
  tar -xzf "$archive_path" -C "$tmpdir" caddy

  sudo install -m 0755 "$tmpdir/caddy" /usr/local/bin/caddy
  sudo mkdir -p /etc/caddy /var/lib/caddy /var/log/caddy

  if ! id caddy >/dev/null 2>&1; then
    sudo useradd --system --home /var/lib/caddy --shell /usr/sbin/nologin caddy
  fi
  sudo chown caddy:caddy /var/lib/caddy /var/log/caddy

  sudo tee /etc/systemd/system/caddy.service >/dev/null <<'EOF'
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
WorkingDirectory=/var/lib/caddy
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile --adapter caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable caddy
  rm -rf "$tmpdir"
}

install_caddy() {
  if [[ "$INSTALL_CADDY" != "true" ]]; then
    return 0
  fi

  if curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/setup.rpm.sh | sudo bash; then
    if pkg_install caddy; then
      sudo systemctl enable caddy
      return 0
    fi
    echo "warning: failed to install Caddy from the package repository; trying binary fallback" >&2
  else
    echo "warning: failed to add the Caddy package repository; trying binary fallback" >&2
  fi

  if ! install_caddy_from_binary; then
    echo "warning: failed to install Caddy via package or binary fallback; continuing without Caddy" >&2
    INSTALL_CADDY="false"
    return 0
  fi
}

wait_for_paperclip() {
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${PAPERCLIP_PORT}/api/health" >/dev/null; then
      return 0
    fi
    sleep 2
  done

  return 1
}

harden_embedded_postgres() {
  local auto_conf=""
  local candidate=""

  for candidate in \
    "${PAPERCLIP_HOME_DIR}/instances/default/db/postgresql.auto.conf" \
    "${PAPERCLIP_HOME_DIR}/db/postgresql.auto.conf"; do
    if [[ -f "$candidate" ]]; then
      auto_conf="$candidate"
      break
    fi
  done

  if [[ -z "$auto_conf" ]]; then
    auto_conf="$(find "${PAPERCLIP_HOME_DIR}" -name postgresql.auto.conf -print -quit 2>/dev/null || true)"
  fi

  if [[ -z "$auto_conf" ]]; then
    echo "warning: embedded PostgreSQL auto config was not found under ${PAPERCLIP_HOME_DIR}" >&2
    return 0
  fi

  python3 - "$auto_conf" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
lines = path.read_text().splitlines()
updates = {
    "dynamic_shared_memory_type": "'sysv'",
    "max_parallel_workers": "0",
    "max_parallel_workers_per_gather": "0",
}

seen = set()
output = []

for line in lines:
    stripped = line.strip()
    replaced = False
    for key, value in updates.items():
        if stripped.startswith(f"{key} ") or stripped.startswith(f"{key}="):
            if key not in seen:
                output.append(f"{key} = {value}")
                seen.add(key)
            replaced = True
            break
    if not replaced:
        output.append(line)

for key, value in updates.items():
    if key not in seen:
        output.append(f"{key} = {value}")

path.write_text("\n".join(output) + "\n")
PY
}

pkg_update
# Amazon Linux 2023 commonly ships curl-minimal; installing full curl causes a package conflict.
pkg_install git jq tar gzip xz docker openssl python3

curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
pkg_install nodejs

install_caddy

sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$REMOTE_USER" || true

mkdir -p "$DEPLOY_ROOT"
mkdir -p \
  "${PAPERCLIP_HOME_DIR}/db" \
  "${PAPERCLIP_HOME_DIR}/logs" \
  "${PAPERCLIP_HOME_DIR}/data/storage" \
  "${PAPERCLIP_HOME_DIR}/data/backups" \
  "${PAPERCLIP_HOME_DIR}/secrets" \
  "${REMOTE_HOME}/openclaw-agents/feishu-bot" \
  "${REMOTE_HOME}/openclaw-agents/sourcing-agent" \
  "${REMOTE_HOME}/openclaw-agents/portfolio-agent" \
  "${REMOTE_HOME}/openclaw-agents/matching-agent"

cat >"${REMOTE_HOME}/openclaw-gateway.env" <<EOF
OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
EOF
chmod 600 "${REMOTE_HOME}/openclaw-gateway.env"

if [[ ! -f "${DEPLOY_ROOT}/package.json" ]]; then
  (
    cd "$DEPLOY_ROOT"
    npm init -y >/dev/null
  )
fi

(
  cd "$DEPLOY_ROOT"
  npm install --omit=dev "@paperclipai/server@${PAPERCLIP_VERSION}"
)

if [[ -z "$BETTER_AUTH_SECRET" && "$PAPERCLIP_DEPLOYMENT_MODE" == "authenticated" ]]; then
  BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
fi

jq -n \
  --arg deploymentMode "$PAPERCLIP_DEPLOYMENT_MODE" \
  --arg deploymentExposure "$PAPERCLIP_DEPLOYMENT_EXPOSURE" \
  --arg host "$PAPERCLIP_HOST" \
  --argjson port "$PAPERCLIP_PORT" \
  --arg dbDir "${PAPERCLIP_HOME_DIR}/db" \
  --arg logDir "${PAPERCLIP_HOME_DIR}/logs" \
  --arg backupDir "${PAPERCLIP_HOME_DIR}/data/backups" \
  --arg storageDir "${PAPERCLIP_HOME_DIR}/data/storage" \
  --arg keyFile "${PAPERCLIP_HOME_DIR}/secrets/master.key" \
  --arg publicBaseUrl "$PAPERCLIP_PUBLIC_URL" \
  '{
    "$meta": {
      version: 1,
      updatedAt: (now | todateiso8601),
      source: "mim-312-bootstrap"
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: $dbDir,
      embeddedPostgresPort: 54329,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: $backupDir
      }
    },
    logging: {
      mode: "file",
      logDir: $logDir
    },
    server: {
      deploymentMode: $deploymentMode,
      exposure: $deploymentExposure,
      host: $host,
      port: $port,
      allowedHostnames: [],
      serveUi: true
    },
    auth: (
      if ($publicBaseUrl | length) > 0 then
        {
          baseUrlMode: "explicit",
          publicBaseUrl: $publicBaseUrl,
          disableSignUp: false
        }
      else
        {
          baseUrlMode: "auto",
          disableSignUp: false
        }
      end
    ),
    storage: {
      provider: "local_disk",
      localDisk: {
        baseDir: $storageDir
      },
      s3: {
        bucket: "paperclip",
        region: "us-east-1",
        prefix: "",
        forcePathStyle: false
      }
    },
    secrets: {
      provider: "local_encrypted",
      strictMode: false,
      localEncrypted: {
        keyFilePath: $keyFile
      }
    }
  }' >"${PAPERCLIP_HOME_DIR}/config.json"

cat >"${PAPERCLIP_HOME_DIR}/runtime.env" <<EOF
PAPERCLIP_CONFIG=${PAPERCLIP_HOME_DIR}/config.json
PAPERCLIP_MIGRATION_AUTO_APPLY=true
PAPERCLIP_OPEN_ON_LISTEN=false
PAPERCLIP_AGENT_JWT_SECRET=${PAPERCLIP_AGENT_JWT_SECRET}
HEARTBEAT_SCHEDULER_ENABLED=true
HEARTBEAT_SCHEDULER_INTERVAL_MS=30000
EOF

if [[ -n "$PAPERCLIP_PUBLIC_URL" ]]; then
  cat >>"${PAPERCLIP_HOME_DIR}/runtime.env" <<EOF
PAPERCLIP_PUBLIC_URL=${PAPERCLIP_PUBLIC_URL}
PAPERCLIP_AUTH_PUBLIC_BASE_URL=${PAPERCLIP_PUBLIC_URL}
PAPERCLIP_AUTH_BASE_URL_MODE=explicit
EOF
fi

if [[ -n "$BETTER_AUTH_SECRET" ]]; then
  cat >>"${PAPERCLIP_HOME_DIR}/runtime.env" <<EOF
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
EOF
fi

chmod 600 "${PAPERCLIP_HOME_DIR}/runtime.env"

sudo tee /etc/systemd/system/paperclip.service >/dev/null <<EOF
[Unit]
Description=Paperclip Control Plane
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=${REMOTE_USER}
WorkingDirectory=${DEPLOY_ROOT}
EnvironmentFile=${PAPERCLIP_HOME_DIR}/runtime.env
ExecStart=/usr/bin/env node ${DEPLOY_ROOT}/node_modules/@paperclipai/server/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable paperclip
sudo systemctl restart paperclip
wait_for_paperclip || true
harden_embedded_postgres
sudo systemctl restart paperclip

if [[ "$INSTALL_CADDY" == "true" && -n "$CADDY_DOMAIN" ]]; then
  sudo mkdir -p /etc/caddy
  sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${CADDY_DOMAIN} {
    encode gzip zstd
    reverse_proxy 127.0.0.1:${PAPERCLIP_PORT}
}
EOF
  sudo systemctl restart caddy || true
fi

wait_for_paperclip

curl -fsS "http://127.0.0.1:${PAPERCLIP_PORT}/api/health" | jq
