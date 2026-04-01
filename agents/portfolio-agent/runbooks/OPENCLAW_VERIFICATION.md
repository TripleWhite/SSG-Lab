# Portfolio Agent OpenClaw Verification Runbook

Use this runbook after repo-local portfolio-agent changes are ready to verify on
EC2-B.

## Preconditions

- Paperclip is healthy at `$PAPERCLIP_API_URL` (remote — `https://board.ssgaccelerator.com`)
- OpenClaw is healthy on `127.0.0.1:18789` (local on EC2-B)
- The runtime agent directory exists at
  `/home/ubuntu/.openclaw/agents/portfolio-agent/`
- The OpenClaw gateway env is available at
  `/home/ubuntu/.openclaw/.env`
- OpenClaw is running as `openclaw-gateway.service`
- Portfolio Agent is present in the company agent list before verification starts

**Important:** Paperclip runs as a remote service at `board.ssgaccelerator.com`,
not locally on EC2-B. All Paperclip API calls must use `$PAPERCLIP_API_URL`.

Load the OpenClaw gateway env before any API calls:

```bash
source /home/ubuntu/.openclaw/.env
```

Verify the env is loaded correctly:

```bash
echo "PAPERCLIP_API_URL=$PAPERCLIP_API_URL"
echo "PAPERCLIP_COMPANY_ID=$PAPERCLIP_COMPANY_ID"
# PAPERCLIP_API_KEY should be set but never printed
test -n "$PAPERCLIP_API_KEY" && echo "PAPERCLIP_API_KEY is set" || echo "ERROR: PAPERCLIP_API_KEY is missing"
```

If any of those variables are empty after sourcing `.openclaw/.env`, stop and
fix the runtime configuration before attempting QA. The current gateway build
does not read `/home/ec2-user/.paperclip/runtime.env`.

## 1. Sync Repo-Local Files Into The Runtime Agent Directory

From the repo root on EC2-B:

```bash
rsync -av --delete \
  agents/portfolio-agent/ \
  /home/ubuntu/.openclaw/agents/portfolio-agent/
```

Spot-check the runtime tree:

```bash
find /home/ubuntu/.openclaw/agents/portfolio-agent -maxdepth 4 -type f | sort
```

Expected files include:

- `SOUL.md`
- `HEARTBEAT.md`
- `settings.json`
- `contracts/SUBAGENT_CONTRACT.md`
- `contracts/feishu-notify.schema.json`
- `contracts/heartbeat-metrics.json`
- `contracts/mimir-store.schema.json`
- `contracts/per-project-scan-output.schema.json`
- `examples/daily-digest.sample.json`
- `examples/urgent-alert.sample.json`
- `examples/board-summary.sample.json`
- `prompts/FEISHU_NOTIFY_PLAYBOOK.md`
- `skills/deal-flow/SKILL.md`
- `skills/resource-map/SKILL.md`
- `skills/feishu-format/SKILL.md`
- `runbooks/paperclip-api.sh`

## 2. Verify Services And Agent Registration

```bash
# Paperclip is remote — check the remote health endpoint
curl -fsS "$PAPERCLIP_API_URL/api/health" | jq

# Portfolio Agent must already exist in the company agent registry
curl -fsS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  | jq '.[] | select(.urlKey == "portfolio-agent" or .name == "Portfolio Agent")'

# OpenClaw is local on EC2-B
curl -fsS http://127.0.0.1:18789/openclaw/ >/dev/null
systemctl status openclaw-gateway --no-pager
```

Expected result:

- Paperclip health returns `200` from remote endpoint
- Portfolio Agent appears in the company agent list
- OpenClaw UI responds locally
- `openclaw-gateway` reports `active (running)`
- Note: there is no local `paperclip.service` on EC2-B — Paperclip is remote infrastructure

## 3. Verify Heartbeat Scheduling And Recent Runs

Inspect the portfolio-agent registration and recent heartbeat history:

```bash
portfolio_agent_id="$(
  curl -fsS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  | jq -r '.[] | select(.urlKey == "portfolio-agent" or .name == "Portfolio Agent") | .id' \
  | head -n 1
)"

test -n "$portfolio_agent_id"

curl -fsS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  | jq --arg id "$portfolio_agent_id" '.[] | select(.id == $id) | {id, name, urlKey, runtimeConfig}'

curl -fsS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/heartbeat-runs?limit=50" \
  | jq --arg id "$portfolio_agent_id" '[.[] | select(.agentId == $id)] | .[:10]'
```

Confirm the registration shows heartbeat config for the daily schedule and that
recent runs exist for the resolved `portfolio_agent_id`.

## 4. Trigger Verification Notes

The historical routes below are not a reliable verification path on the current
control-plane build and should not be used as the source of truth:

```bash
/api/companies/$PAPERCLIP_COMPANY_ID/agents/portfolio-agent/heartbeats
/api/companies/$PAPERCLIP_COMPANY_ID/agents/portfolio-agent/heartbeats/trigger
```

On current deployments they return `404`. Validate portfolio execution from:

1. the registered company agent record,
2. recent entries in `/api/companies/$PAPERCLIP_COMPANY_ID/heartbeat-runs`,
3. `openclaw-gateway` logs, and
4. the resulting Feishu/Paperclip side effects.

If on-demand verification is required before the next scheduled run, use the
current board/operator flow that wakes the agent after registration is fixed.
Do not guess undocumented trigger endpoints.

## 5. Watch Runtime Logs

Primary production check:

```bash
journalctl -u openclaw-gateway -n 200 --no-pager
```

Look for:

- portfolio-agent session start
- `HEARTBEAT.md` load
- `deal-flow` and `resource-map` skill usage
- notify payload generation
- Feishu send activity or callback errors

## 6. Verify Notification Payloads

For notify payload spot-checks, validate against:

- `contracts/feishu-notify.schema.json`
- `examples/daily-digest.sample.json`
- `examples/urgent-alert.sample.json`
- `examples/board-summary.sample.json`
- `skills/feishu-format/SKILL.md`
- `prompts/FEISHU_NOTIFY_PLAYBOOK.md`

Check all three output modes when available:

- `daily_digest`
- `urgent_alert`
- `board_summary`

Before checking live payloads, confirm the bundled samples still parse cleanly:

```bash
jq empty \
  examples/daily-digest.sample.json \
  examples/urgent-alert.sample.json \
  examples/board-summary.sample.json
```

Use the sample payloads as the canonical reference shape when comparing runtime
cards to the schema and visible Feishu rendering.

## 7. Verify Paperclip And Feishu Outcomes

Expected Paperclip results:

- the heartbeat run is recorded for the resolved `portfolio_agent_id`
- any triggered follow-up task or summary comment appears on the relevant issue
- blocked conditions are called out explicitly when verification fails

Expected Feishu results:

- the employee digest shows only that employee's projects
- urgent cards are single-item and action-oriented
- the Board summary shows stage counts, health counts, and top actions
- action buttons render as expected for the chosen card type

## 8. Success Criteria

Treat the run as successful only if all of the following are true:

1. The heartbeat run is recorded in Paperclip.
2. Portfolio Agent is present in the company agent registry.
3. The runtime tree includes the full contract/example set from the repo.
4. OpenClaw logs show the portfolio-agent session starting and completing.
5. The notify payload validates against the portfolio contract.
6. The employee digest is correctly sorted by urgency.
7. The Board summary shows coherent aggregate counts.
8. Any urgent project produces an urgent card instead of waiting for the daily
   digest.

## 9. Failure Handling

- If the agent fails to load, re-check the runtime tree under
  `/home/ubuntu/.openclaw/agents/portfolio-agent/`.
- If Portfolio Agent is missing from `/api/companies/$PAPERCLIP_COMPANY_ID/agents`,
  stop and block release. The runtime cannot receive scheduled heartbeats until
  registration is fixed.
- If `.openclaw/.env` does not export Paperclip API settings, stop and block
  release. The gateway runtime is not configured for control-plane access.
- If the heartbeat fires but notifications do not send, inspect
  `settings.json`, `HEARTBEAT.md`, and the session logs together.
- If Feishu delivery fails, validate the payload against
  `contracts/feishu-notify.schema.json` and re-check the visible format in
  `skills/feishu-format/SKILL.md`.
- If verification cannot complete, leave the Paperclip task `in_progress` or
  `blocked` with the exact failed step and evidence.
