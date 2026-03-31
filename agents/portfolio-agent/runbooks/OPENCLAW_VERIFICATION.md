# Portfolio Agent OpenClaw Verification Runbook

Use this runbook after repo-local portfolio-agent changes are ready to verify on
EC2-B.

## Preconditions

- Paperclip is healthy on `127.0.0.1:3100`
- OpenClaw is healthy on `127.0.0.1:18789`
- The runtime agent directory exists at
  `/home/ec2-user/openclaw-agents/portfolio-agent/`
- Paperclip runtime env is available at
  `/home/ec2-user/.paperclip/runtime.env`
- OpenClaw is running as `openclaw-gateway.service`

Load runtime env before any API calls:

```bash
source /home/ec2-user/.paperclip/runtime.env
```

## 1. Sync Repo-Local Files Into The Runtime Agent Directory

From the repo root on EC2-B:

```bash
rsync -av --delete \
  agents/portfolio-agent/ \
  /home/ec2-user/openclaw-agents/portfolio-agent/
```

Spot-check the runtime tree:

```bash
find /home/ec2-user/openclaw-agents/portfolio-agent -maxdepth 4 -type f | sort
```

Expected files include:

- `SOUL.md`
- `HEARTBEAT.md`
- `settings.json`
- `contracts/feishu-notify.schema.json`
- `contracts/mimir-store.schema.json`
- `examples/daily-digest.sample.json`
- `examples/urgent-alert.sample.json`
- `examples/board-summary.sample.json`
- `prompts/FEISHU_NOTIFY_PLAYBOOK.md`
- `skills/deal-flow/SKILL.md`
- `skills/resource-map/SKILL.md`
- `skills/feishu-format/SKILL.md`
- `runbooks/paperclip-api.sh`

## 2. Verify Services Before Triggering The Agent

```bash
curl -fsS http://127.0.0.1:3100/api/health | jq
curl -fsS http://127.0.0.1:18789/openclaw/ >/dev/null
systemctl status paperclip --no-pager
systemctl status openclaw-gateway --no-pager
```

Expected result:

- Paperclip health returns `200`
- OpenClaw UI responds
- Both services report `active (running)`

## 3. Verify Heartbeat Scheduling

Inspect the portfolio-agent heartbeat configuration:

```bash
curl -fsS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "http://127.0.0.1:3100/api/companies/$PAPERCLIP_COMPANY_ID/agents/portfolio-agent/heartbeats" \
  | jq
```

Confirm the daily schedule still reflects `9am UTC+8` and that manual triggers
remain enabled.

## 4. Trigger A Manual Portfolio Run

Trigger a scoped portfolio run for one project:

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  "http://127.0.0.1:3100/api/companies/$PAPERCLIP_COMPANY_ID/agents/portfolio-agent/heartbeats/trigger" \
  -d '{
    "scope": "project",
    "project_id": "<paperclip-project-id>"
  }' \
  | jq
```

For a full digest run, omit the scoped body and trigger the default daily
heartbeat path instead.

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

- the heartbeat run is recorded
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
2. OpenClaw logs show the portfolio-agent session starting and completing.
3. The notify payload validates against the portfolio contract.
4. The employee digest is correctly sorted by urgency.
5. The Board summary shows coherent aggregate counts.
6. Any urgent project produces an urgent card instead of waiting for the daily
   digest.

## 9. Failure Handling

- If the agent fails to load, re-check the runtime tree under
  `/home/ec2-user/openclaw-agents/portfolio-agent/`.
- If the heartbeat fires but notifications do not send, inspect
  `settings.json`, `HEARTBEAT.md`, and the session logs together.
- If Feishu delivery fails, validate the payload against
  `contracts/feishu-notify.schema.json` and re-check the visible format in
  `skills/feishu-format/SKILL.md`.
- If verification cannot complete, leave the Paperclip task `in_progress` or
  `blocked` with the exact failed step and evidence.
