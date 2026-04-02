# EC2-B Deployment Runbook

## What Is Live

- `board.ssgaccelerator.com` terminates TLS in Caddy and reverse proxies to Paperclip on `127.0.0.1:3100`.
- The binary-fallback `caddy.service` runs as `User=caddy` / `Group=caddy`.
- Paperclip runs as `paperclip.service` from `@paperclipai/server@2026.325.0` with embedded Postgres, local encrypted secrets, and a 30 second heartbeat scheduler.
- OpenClaw runs from source as `openclaw-gateway.service` on `127.0.0.1:18789` with its control UI at `http://127.0.0.1:18789/openclaw/`.
- The EC2-B security group exposes only `22` and `443` publicly. Paperclip (`3100`) and OpenClaw (`18789`) stay loopback-only.
- Mimir stays on EC2-A at `https://api.allinmimir.com`.
- Feishu is wired in websocket mode through `feishu-bot`.

## Dashboard Alias And OAuth

- `https://dash.ssgaccelerator.com` is the Vercel-hosted dashboard alias.
- Anonymous `GET /` requests redirect to `/login`.
- `NEXTAUTH_URL` on Vercel must stay `https://dash.ssgaccelerator.com`.
- The Feishu app config must set homepage URL `https://dash.ssgaccelerator.com` and redirect URL `https://dash.ssgaccelerator.com/api/auth/feishu`.
- `BOARD_FEISHU_OPEN_IDS` is optional. When it is unset, authenticated users still sign in, but `/analytics` and `/settings` stay hidden behind the `employee` role.

### Vercel Production Env (confirmed 2026-04-01, MIM-493)

| Variable | Value | Notes |
|---|---|---|
| `FEISHU_APP_ID` | set | Must match the SSG Lab Feishu app |
| `FEISHU_APP_SECRET` | set | Rotate after any credential exposure |
| `NEXTAUTH_SECRET` | set | Random string; rotate if leaked |
| `NEXTAUTH_URL` | `https://dash.ssgaccelerator.com` | Must not include trailing slash |
| `BOARD_FEISHU_OPEN_IDS` | set (comma-separated Feishu open IDs) | Grants `board` role; omit to allow any authenticated Feishu user |
| `PAPERCLIP_API_URL` | `https://board.ssgaccelerator.com` | Points at EC2-B Caddy ingress |
| `PAPERCLIP_API_KEY` | set | Scoped board API key |
| `PAPERCLIP_COMPANY_ID` | set | SSG Lab company ID |
| `MIMIR_API_URL` | `https://api.allinmimir.com` | EC2-A Mimir instance |
| `MIMIR_API_KEY` | set | Rotate after any credential exposure |
| `MIMIR_USER_ID` | set | SSG Lab Mimir user |

### Verification Results (confirmed 2026-04-01)

- `GET https://dash.ssgaccelerator.com/` → `307` to `/login` ✓
- `GET https://dash.ssgaccelerator.com/login` → `200`, sign-in link to `/api/auth/feishu` present ✓
- `GET https://dash.ssgaccelerator.com/api/auth/feishu` → `307` to Feishu authorize; `ssg_oauth_state` cookie set with `HttpOnly`, `Secure`, `SameSite=Lax` ✓

### Feishu OAuth Rotation Procedure

When rotating Feishu credentials:

1. Update `FEISHU_APP_SECRET` (and `FEISHU_APP_ID` if the app changes) in Vercel dashboard under `dash.ssgaccelerator.com` environment variables.
2. Trigger a Vercel redeploy (push a no-op commit or use Vercel UI "Redeploy").
3. Confirm `GET /api/auth/feishu` still returns `307` to Feishu authorize and sets the `ssg_oauth_state` cookie.
4. Complete a full Feishu login round-trip in the browser to verify the session cookie is granted.
5. Rotate `NEXTAUTH_SECRET` only if it was exposed; otherwise leave it unchanged to avoid invalidating active sessions.

### Feishu Login CORS Fix (MIM-461, confirmed 2026-04-01)

- `/login` now renders a native `<a href="/api/auth/feishu">Sign in with Feishu</a>` anchor tag (not a JS-driven redirect), which resolves the CORS-related login handoff breakage.
- `HEAD https://dash.ssgaccelerator.com/api/auth/feishu` returns `307` to Feishu authorize and sets the `ssg_oauth_state` cookie.
- Remaining gap: [MIM-460](/MIM/issues/MIM-460) is still open (post-login redirect) and the full Feishu → Mimir E2E re-test remains pending.

## Bootstrap Order

1. Provision EC2-B with [`scripts/release/provision-ec2b.sh`](../scripts/release/provision-ec2b.sh).
2. Install Paperclip, embedded Postgres, Caddy, and the runtime env with [`scripts/release/bootstrap-paperclip-host.sh`](../scripts/release/bootstrap-paperclip-host.sh).
3. Build OpenClaw from source and install the gateway service with [`scripts/release/bootstrap-openclaw-host.sh`](../scripts/release/bootstrap-openclaw-host.sh).
4. Seed the company and OpenClaw-backed agent records with [`scripts/release/seed-ssg-company.sh`](../scripts/release/seed-ssg-company.sh).

If you need a reproducible rollout, export `OPENCLAW_REPO_REF` as a tag or commit SHA before step 3. The script still accepts `main`, but it warns because a moving branch is not audit-friendly.

## Phase 3 Matching Agent — Architecture and Operations

### What It Does

Detects complementary connections across employees, projects, and accelerator resources. Triggered every 30 minutes by Paperclip heartbeat and on new Mimir content. Delivers HIGH-confidence matches immediately to the Feishu group chat; batches MEDIUM-confidence matches into a daily digest for the Board.

### Match Types

| Type | Pattern |
|---|---|
| Supply-Demand | Company A needs what Company B offers |
| Resource | Founder needs accelerator resource (credits, legal, connections) |
| Talent | Hiring need ↔ talent pool candidate |
| Investor | Fundraising signal ↔ LP vertical/stage match |
| Cross-Project | Portfolio company A capability ↔ company B need |
| Mentor | Founder bottleneck ↔ mentor expertise |

### Confidence Thresholds

| Tier | Threshold | Action |
|---|---|---|
| HIGH | > 80% | Immediate Feishu group chat notification |
| MEDIUM | 60–80% | Batched daily digest to Board |
| Below 60% | — | Not reported |

Scoring: specificity of need × specificity of offer × recency × dedup check against existing Mimir `MATCH_FOUND` relations.

### Graph Traversal

Uses `POST /api/v1/graph/traverse` on Mimir API. Relation types: `HAS_CONNECTION` (employee), `INTERESTED_IN` (LP), `EXPERT_IN` (mentor), `OFFERS` (partner programs), `CAN_PROVIDE` (portfolio capabilities).

### Heartbeat Logic

1. Load context and last heartbeat timestamp.
2. `memory_search` for event logs since last heartbeat — exit early if none (token-efficient).
3. Extract needs and offers per entity/project.
4. Run 6 match-type analyses.
5. Dedup against Mimir history, route results.

### Runtime

- **Model**: `minimax/MiniMax-M2.7` via `https://api.minimaxi.com/anthropic`
- **Session key**: `agent:matching-agent:main` (reset required after workspace bootstrap changes)
- **Plugin**: `matching-agent-tools` (must be explicitly enabled — see plugin section below)
- **`store_match` timeout**: 30 s default, 60 s EC2-B runtime override via `MATCHING_AGENT_INGEST_POLL_TIMEOUT_MS`

### Known Gaps (2026-04-02)

- MEDIUM-match queueing and daily digest delivery not yet E2E verified.
- `send_feishu_card` contract alignment still under review.
- Full Feishu → Mimir E2E re-test pending after MIM-553 session-key fix.

## Matching-Agent MiniMax Rollout (EC2-B, MIM-498)

**Host**: `i-04401d9241a5213f6`
**Deployed**: 2026-04-01
**Model**: `minimax/MiniMax-M2.7`, provider base URL `https://api.minimaxi.com/anthropic`

### Path Clarification

The live runtime on this host uses `/home/ubuntu/.openclaw` — **not** `/home/ec2-user/.openclaw`. The `ec2-user` home path is absent on this host. All EC2-B operations that reference `/home/ec2-user/.openclaw` in earlier docs should be read as `/home/ubuntu/.openclaw` when applying to this instance.

### Deploy Artifacts

| Artifact | Purpose |
|---|---|
| `/home/ubuntu/.openclaw/.env.mim498.20260401T123758Z.bak` | Pre-rollout env backup |
| `/home/ubuntu/.openclaw/openclaw.json.mim498.20260401T123758Z.bak` | Pre-rollout config backup |
| `/home/ubuntu/.openclaw/agents/matching-agent/sessions.reset.20260401T124117Z` | Session reset marker |

### Verification Evidence

- `openclaw-gateway.service` reported `active (running)` post-deploy.
- `config validate` returned `valid: true`.
- `gateway call health` returned `OK`.
- Live verify turn completed in ~15 s and returned `provider=minimax`, `model=MiniMax-M2.7`.

### Pre-Existing Fix: Plugin Ownership Drift

Before config validation could pass, a file ownership drift was corrected on:

- `/home/ubuntu/.openclaw/extensions/memory-mimir/`
- `/home/ubuntu/.openclaw/extensions/mem9/`

If `config validate` fails on a fresh or re-provisioned host, check extension directory ownership first.

### Security Note

The `MINIMAX_API_KEY` was pasted into issue comments during rollout and should be rotated after QA / cutover if it is a production-grade key.

## Matching-Agent Plugin Deploy (EC2-B)

The `matching-agent-tools` plugin must be explicitly enabled in the OpenClaw config and its extension files deployed before matching runs will pick up the custom tools.

### Plugin Enable

Add (or verify) this entry in `/home/ec2-user/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "matching-agent-tools": {
        "enabled": true
      }
    }
  }
}
```

Without `enabled: true` the plugin is present on disk but ignored at runtime.

### Paths

| Artifact | Path |
|---|---|
| Matching-agent workspace (bootstrap source) | `/home/ec2-user/openclaw-agents/matching-agent/` |
| Plugin extension files | `/home/ec2-user/.openclaw/extensions/matching-agent-tools/` |
| OpenClaw config | `/home/ec2-user/.openclaw/openclaw.json` |

The bootstrap source-of-truth for workspace files is the `openclaw-agents/matching-agent/` tree (committed as of `0bcc609`). Do not rely on `.openclaw/agents/matching-agent/` as the authoritative source — that is state/transcript storage.

### Post-Deploy Verification Commands

Run these via the OpenClaw gateway after restarting `openclaw-gateway.service`:

```bash
# Confirm plugin tools are registered
gateway call tools.catalog

# Reset the fixed session to pick up new workspace bootstrap
gateway call sessions.reset agent:matching-agent:main

# Confirm agent health
gateway call health
```

A successful `tools.catalog` response should list the `matching-agent-tools` entries. If they are absent, re-check the `openclaw.json` `plugins.entries` block and restart the service.

## Phase 3 Matching-Agent Deploy Note

- OpenClaw injects `AGENTS.md`, `SOUL.md`, and `HEARTBEAT.md` from the agent `workspace`, not from `agentDir`.
- For `matching-agent`, the intended bootstrap workspace is `/home/ec2-user/openclaw-agents/matching-agent/` unless `OPENCLAW_WORKSPACE_ROOT` was overridden during host bootstrap.
- The `/home/ubuntu/.openclaw/agents/matching-agent/` tree observed on `2026-03-30` is agent state and transcript storage, not the workspace that feeds bootstrap injection.
- A restore snapshot was captured at `/home/ubuntu/.openclaw/agents/matching-agent.release.20260330202111.tgz`; treat that as state backup evidence only.
- Because `matching-agent` uses a fixed session key, any change to workspace bootstrap files must be followed by a reset or deletion of session `agent:matching-agent:main` before QA reruns, otherwise OpenClaw can reuse a cached bootstrap snapshot. The pre-MIM-553 transcript was rotated to backup before the fix was applied.
- `store_match` ingest poll default timeout is **30 s** (`DEFAULT_INGEST_POLL_TIMEOUT_MS = 30_000`), raised from the previous 10 s. The EC2-B runtime overrides this to **60 s** via `MATCHING_AGENT_INGEST_POLL_TIMEOUT_MS=60000` in `.openclaw/.env`.
- To adjust the timeout without a code change, set `MATCHING_AGENT_INGEST_POLL_TIMEOUT_MS` (milliseconds) in `/home/ec2-user/.openclaw/.env` and restart `openclaw-gateway.service`.
- `board.ssgaccelerator.com` currently resolves to `ssg-agent-system`; do not use that DNS name as proof that the matching-agent runtime lives on the same instance.

## Services And Paths

- Paperclip app root: `/home/ec2-user/paperclip-app`
- Paperclip state: `/home/ec2-user/.paperclip/`
- Paperclip env: `/home/ec2-user/.paperclip/runtime.env`
- Paperclip service: `paperclip.service`
- OpenClaw source: `/home/ec2-user/openclaw-src`
- OpenClaw state: `/home/ec2-user/.openclaw/`
- OpenClaw env: `/home/ec2-user/.openclaw/.env`
- OpenClaw service: `openclaw-gateway.service`
- Shared gateway token file: `/home/ec2-user/openclaw-gateway.env`
- Bootstrap script default workspaces: `/home/ec2-user/openclaw-agents/{feishu-bot,sourcing-agent,portfolio-agent,matching-agent}`
- Matching-agent bootstrap workspace: `/home/ec2-user/openclaw-agents/matching-agent/`
- Matching-agent agentDir/state path: `/home/ec2-user/.openclaw/agents/matching-agent/agent/`

## Required Runtime Details

- Paperclip binds to loopback on `127.0.0.1:3100`.
- OpenClaw binds to loopback on `127.0.0.1:18789`.
- Caddy is the only intended public ingress layer for the board host.
- `caddy.service` must report `User=caddy` and `Group=caddy`.
- Public ingress on the EC2-B security group should be limited to `22` and `443`.
- `bootstrap-openclaw-host.sh` accepts branch names, tags, and commit SHAs through `OPENCLAW_REPO_REF`.
- Each OpenClaw-backed Paperclip agent needs an explicit session key:
  - `feishu-bot` -> `agent:feishu-bot:main`
  - `sourcing-agent` -> `agent:sourcing-agent:main`
  - `portfolio-agent` -> `agent:portfolio-agent:main`
  - `matching-agent` -> `agent:matching-agent:main`

## Caddy Ownership Note

- If you migrate Caddy home or storage paths to the `caddy` user on an already-running host, expect the next restart to reprovision TLS state once.
- After any Caddy user, storage, or reverse-proxy change, re-run the public board health check at `https://board.ssgaccelerator.com/api/health` before declaring the host healthy.

## Verification Checklist

```bash
curl -fsS http://127.0.0.1:3100/api/health | jq
curl -fsS https://board.ssgaccelerator.com/api/health | jq
curl -I https://board.ssgaccelerator.com
curl -fsS http://127.0.0.1:18789/openclaw/
curl -I https://dash.ssgaccelerator.com
curl -fsS https://dash.ssgaccelerator.com/login | grep -o 'href="/api/auth/feishu"'
curl -sS -D - -o /dev/null https://dash.ssgaccelerator.com/api/auth/feishu
jq '.agents.list[] | select(.id == "matching-agent") | {workspace, agentDir}' /home/ec2-user/.openclaw/openclaw.json
ls -l /home/ec2-user/openclaw-agents/matching-agent/AGENTS.md /home/ec2-user/openclaw-agents/matching-agent/SOUL.md /home/ec2-user/openclaw-agents/matching-agent/HEARTBEAT.md
systemctl status paperclip --no-pager
systemctl status openclaw-gateway --no-pager
systemctl status caddy --no-pager
systemctl show caddy -p User -p Group
journalctl -u openclaw-gateway -n 50 --no-pager
```

Expected results:

- Paperclip health returns `200` both locally and through `https://board.ssgaccelerator.com/api/health`.
- The board host serves valid TLS through Caddy.
- The OpenClaw control UI returns `200`.
- `https://dash.ssgaccelerator.com` returns `307` from `/` to `/login`.
- `/login` includes a sign-in link to `/api/auth/feishu`.
- `GET https://dash.ssgaccelerator.com/api/auth/feishu` returns `307` to Feishu authorize and sets the `ssg_oauth_state` cookie.
- `openclaw.json` reports `matching-agent.workspace` under `/home/ec2-user/openclaw-agents/matching-agent` and keeps `agentDir` under `.openclaw/agents/...`.
- The matching-agent workspace contains the expected bootstrap files before any QA rerun.
- `systemctl show caddy` reports `User=caddy` and `Group=caddy`.
- AWS security group ingress shows only `22` and `443` as public rules.
- All three services are `active (running)`.

## Sourcing-Agent Brave Search Env Injection (MIM-395)

**Shipped**: 2026-03-31

### What Changed

`openclaw-gateway.service` now loads `/home/ubuntu/.openclaw/.env` through a systemd drop-in at `10-env.conf`. This injects `BRAVE_API_KEY` (and any other variables in `.env`) into the service process without requiring them to be set in the base unit file.

### Required Env Variable

| Variable | Purpose |
|---|---|
| `BRAVE_API_KEY` | Required for Brave-backed `web_search` in the deployed OpenClaw runtime |

Add to `/home/ubuntu/.openclaw/.env`:

```
BRAVE_API_KEY=<your-key>
```

Then restart the service:

```bash
systemctl daemon-reload
systemctl restart openclaw-gateway.service
```

### Secret Handling Note

Board-provided secrets may contain markdown-escaped characters (e.g., `\*`, `\_`). **Unescape these before writing to `.env` files.** A key written with escape sequences will fail silently — the API call will return an auth error rather than a parse error.

### Verification Steps

1. Restart `openclaw-gateway.service` and confirm `active (running)`.
2. Check the OpenClaw UI at `http://127.0.0.1:18789/openclaw/` returns `200`.
3. Trigger a raw `web_search` tool call through the gateway and confirm the `toolResult` contains web results (not an auth error).

## EC2-B Runtime Config: Feishu Channel + memory-mimir Upgrade (MIM-421, 2026-03-31)

### What Changed

- **Feishu channel enabled**: `feishu-bot` agent's OpenClaw config now has the Feishu channel active so the bot receives and dispatches messages via websocket.
- **memory-mimir upgraded to `4.0.0-rc.1`**: new version adds `memory_store` and `memory_search` tool support.

### Verification Evidence

- `memory_store` call succeeded and returned a stored memory ID.
- `memory_search` query returned expected results from the stored memory.
- `openclaw-gateway.service` remained `active (running)` after the upgrade.

### Rollback Point

A backup of the pre-change `openclaw.json` and `.env` was captured before the upgrade. Refer to [MIM-421](/MIM/issues/MIM-421) for the exact backup path. To roll back: restore the backup files and restart `openclaw-gateway.service`.

### Temporary Key Files

Any temporary credential or key files created during the memory-mimir upgrade must be deleted after verification. Do not leave key material in `/tmp` or home directory files between deploys.

## Agent Instructions Path: AGENTS.md Convention (MIM-426)

**Shipped**: 2026-03-31

### What Changed

Previously, agent instruction paths were set via `instructionsFilePath` in `openclaw.json`. That config key is **not valid** in OpenClaw and was silently ignored. The correct mechanism is the Paperclip `PATCH /api/agents/{id}/instructions-path` API.

### Current Convention

Each OpenClaw-native agent (`matching-agent`, `sourcing-agent`, `portfolio-agent`) has:

- An `AGENTS.md` file in its workspace directory as the instruction entry point.
- `AGENTS.md` loads `HEARTBEAT.md` and any role-specific instructions.

`seed-ssg-company.sh` registers these paths via:

```bash
PATCH /api/agents/{agentId}/instructions-path
{ "path": "agents/{agent-name}/AGENTS.md" }
```

### Bootstrap Behavior: strip_paperclip_skill()

`bootstrap-openclaw-host.sh` calls `strip_paperclip_skill()` to remove `.claude/skills/paperclip/` from each OpenClaw-native agent workspace. Without this step, the generic Paperclip heartbeat skill would override the domain-specific agent instructions (AGENTS.md + HEARTBEAT.md) and cause agents to behave as generic task executors rather than their specialized roles.

If you observe an agent behaving as a generic Paperclip task worker instead of its specialized role, check:

1. `.claude/skills/paperclip/` is absent in the agent workspace.
2. `instructions-path` is registered correctly via the Paperclip API.
3. The agent workspace contains the expected `AGENTS.md` and `HEARTBEAT.md`.

## OpenClaw Plugin Allowlist (Memory Contamination Fix, MIM-409)

**Shipped**: 2026-03-31

Prior to this fix, `mem9` was enabled as a context engine on EC2-B and injected context automatically into agent prompts, causing memory contamination across sessions.

### Live openclaw.json State (confirmed post-fix)

```json
{
  "plugins": {
    "allow": ["memory-mimir", "telegram"],
    "slots": { "memory": "memory-mimir" }
  }
}
```

- `mem9` is absent from `plugins.allow` and has no `contextEngine` slot — prompt injection from `mem9` is disabled.
- `memory-mimir` is in tool-only mode: `autoRecall: false` and `autoCapture: false` in all agent `settings.json` files.
- Agents can invoke memory tools explicitly but the context engine does not auto-inject.

### Bootstrap Responsibility

`bootstrap-openclaw-host.sh` now explicitly sets this allowlist. Fresh deploys do not require manual cleanup; the script enforces the correct plugin state from the start.

### Backup Evidence

A pre-fix backup of `openclaw.json` was saved before the change was applied. Refer to [MIM-409](/MIM/issues/MIM-409) for the exact backup path and verification evidence.

## Anthropic SDK MCP inputSchema Patch

- `bootstrap-openclaw-host.sh` automatically patches the Anthropic SDK MCP helper to guard against missing `inputSchema.properties` on tool definitions.
- This prevents the `Cannot read properties of undefined (reading 'properties')` crash that surfaced when the Feishu bot received @mention messages (MIM-534).
- The patch was originally applied manually in MIM-520 and is now baked into the bootstrap so every fresh deploy includes it without extra steps.
- If you upgrade `openclaw` or the Anthropic SDK and the bot crashes again on @mention, re-check that the bootstrap patch step is still compatible with the new package version.

## Feishu-Bot Context Recovery Deploy (EC2-B, MIM-585, 2026-04-02)

**Host**: `i-04401d9241a5213f6`
**Deployed**: 2026-04-02T22:25Z

### What Changed

The feishu-bot agent files were updated to add follow-up context recovery. The fix addresses private-chat "?" responses when users sent follow-up messages that referenced prior context.

| File | Change |
|---|---|
| `HEARTBEAT.md` | Added step 3b: context recovery via Mimir `event_log` lookup (30-min window) before intent fallback |
| `SOUL.md` | "Ambiguous fragments" discard rule now attempts context recovery first |

### Deploy Artifacts

| Artifact | Path |
|---|---|
| Updated agent files | `/home/ubuntu/.openclaw/agents/feishu-bot/` |
| HEARTBEAT.md backup | `/home/ubuntu/.openclaw/agents/feishu-bot/HEARTBEAT.md.mim585.20260402T222532Z.bak` |
| SOUL.md backup | `/home/ubuntu/.openclaw/agents/feishu-bot/SOUL.md.mim585.20260402T222532Z.bak` |

### Verification

- `HEARTBEAT.md` hash: `1473cfc88674445292536a5a02534fa1285c182639809a1c9a1b88565f8af55e`
- `SOUL.md` hash: `0b5d3582da3b35fc07fb12e88704e1f65fe51bd5b443809fdf90c8d1d6b5a9ba`
- `openclaw-gateway.service`: `active (running)` post-deploy
- `http://127.0.0.1:18789/openclaw/` returns HTML
- Board health check: `https://board.ssgaccelerator.com/api/health` → `{"status":"ok"}`

No config changes (env or `openclaw.json`) were required for this fix.

## Known Follow-Up Items

- Completed 2026-03-29: EC2-B public ingress is limited to `22` and `443`; `3000` and `18789` are no longer internet-reachable.
- Completed 2026-03-29: the binary-fallback `caddy.service` now runs as `User=caddy` / `Group=caddy`.
- Rotate any credential that was ever pasted into issue comments or other long-lived logs.
- Close the review-reported anonymous write exposure on the board management API before calling the deployment production-ready.
- Phase 3 matching-agent artifacts are deployed, but review and E2E sign-off still remain around MEDIUM-match queueing and `send_feishu_card` contract alignment.
- Re-run the real Feishu -> Mimir E2E checklist after the OpenClaw session-key fix and after deciding whether to seed real SSG data or narrow the resource-graph acceptance criteria.
- Replace the placeholder entries in [`data/resource-graph-seed.json`](../data/resource-graph-seed.json) before using resource-graph search in production.
