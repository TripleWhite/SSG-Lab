# Portfolio Agent OpenClaw Verification Runbook

Use this runbook after repo-local portfolio-agent changes are ready to verify on
EC2-B.

## Preconditions

- OpenClaw is healthy on `127.0.0.1:18789` (local on EC2-B)
- The runtime agent directory exists at
  `/home/ubuntu/.openclaw/agents/portfolio-agent/`
- The OpenClaw gateway config exists at
  `/home/ubuntu/.openclaw/openclaw.json`
- OpenClaw is running as `openclaw-gateway.service`
- System cron is active on EC2-B

Portfolio-agent is no longer scheduled by Paperclip heartbeats. The daily run
is dispatched directly on EC2-B through `/etc/cron.d/portfolio-agent`.

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

## 2. Install And Verify The System-Cron Scheduler

From the repo root on EC2-B:

```bash
REMOTE_USER=ubuntu \
REMOTE_HOME=/home/ubuntu \
OPENCLAW_STATE_DIR=/home/ubuntu/.openclaw \
OPENCLAW_CONFIG_PATH=/home/ubuntu/.openclaw/openclaw.json \
scripts/release/install-portfolio-agent-cron.sh
```

Verify the installed assets:

```bash
ls -l /home/ubuntu/.openclaw/bin/run-portfolio-agent.sh
sudo cat /etc/cron.d/portfolio-agent
systemctl status cron --no-pager || systemctl status crond --no-pager
```

Expected result:

- `run-portfolio-agent.sh` exists and is executable
- `/etc/cron.d/portfolio-agent` contains `CRON_TZ=UTC`
- the schedule is `0 9 * * *`
- the cron target is `ubuntu`
- the command appends to `/home/ubuntu/.openclaw/logs/portfolio-agent-cron.log`

## 3. Verify Services And Local Runtime

```bash
curl -fsS http://127.0.0.1:18789/openclaw/ >/dev/null
systemctl status openclaw-gateway --no-pager
sed -n '110,135p' /home/ubuntu/.openclaw/openclaw.json
```

Expected result:

- OpenClaw UI responds locally
- `openclaw-gateway` reports `active (running)`
- `portfolio-agent` is present in `openclaw.json`
- `portfolio-agent` does not rely on an OpenClaw `heartbeat` stanza

## 4. Run A No-Side-Effect Smoke Dispatch

Before waiting for the next 09:00 UTC cron tick, run the wrapper once with a
safe override message:

```bash
PORTFOLIO_AGENT_MESSAGE_OVERRIDE='Smoke test only. Load your workspace and reply with exactly "portfolio-agent dispatch ok". Do not send notifications, create tasks, or write memory.' \
PORTFOLIO_AGENT_SESSION_ID_OVERRIDE="agent:portfolio-agent:smoke:$(date -u +%Y%m%dT%H%M%SZ)" \
PORTFOLIO_AGENT_TIMEOUT=180 \
/home/ubuntu/.openclaw/bin/run-portfolio-agent.sh
```

Expected result:

- the wrapper prints a dispatch line with the generated session id
- the command exits `0`
- the response is valid JSON from `openclaw agent --json`

## 5. Watch Runtime Logs

Primary production checks:

```bash
tail -n 50 /home/ubuntu/.openclaw/logs/portfolio-agent-cron.log
journalctl -u openclaw-gateway -n 200 --no-pager
```

Look for:

- the wrapper dispatch line with session id
- portfolio-agent session start
- `HEARTBEAT.md` load
- `deal-flow` and `resource-map` skill usage
- notify payload generation or explicit smoke-test early exit

## 6. Verify Notification Payload Samples

For notify payload spot-checks, validate against:

- `contracts/feishu-notify.schema.json`
- `examples/daily-digest.sample.json`
- `examples/urgent-alert.sample.json`
- `examples/board-summary.sample.json`
- `skills/feishu-format/SKILL.md`
- `prompts/FEISHU_NOTIFY_PLAYBOOK.md`

Before checking live payloads, confirm the bundled samples still parse cleanly:

```bash
jq empty \
  examples/daily-digest.sample.json \
  examples/urgent-alert.sample.json \
  examples/board-summary.sample.json
```

Use the sample payloads as the canonical reference shape when comparing runtime
cards to the schema and visible Feishu rendering.

## 7. Success Criteria

Treat the run as successful only if all of the following are true:

1. The runtime tree includes the full contract/example set from the repo.
2. `/etc/cron.d/portfolio-agent` exists with the 09:00 UTC schedule.
3. `/home/ubuntu/.openclaw/bin/run-portfolio-agent.sh` exists and is executable.
4. OpenClaw logs show the portfolio-agent session starting and completing.
5. The smoke dispatch exits successfully.
6. The notify payload samples still validate against the portfolio contract.
7. The wrapper log records dispatch and exit status for the smoke run.

## 8. Failure Handling

- If the agent fails to load, re-check the runtime tree under
  `/home/ubuntu/.openclaw/agents/portfolio-agent/`.
- If the wrapper fails before dispatch, verify
  `/home/ubuntu/.openclaw/openclaw.json`,
  `/home/ubuntu/.openclaw/bin/run-portfolio-agent.sh`, and the OpenClaw CLI
  path together.
- If cron is present but does not fire, inspect `/etc/cron.d/portfolio-agent`,
  `systemctl status cron`, and
  `/home/ubuntu/.openclaw/logs/portfolio-agent-cron.log`.
- If notifications fail, validate the payload against
  `contracts/feishu-notify.schema.json` and re-check the visible format in
  `skills/feishu-format/SKILL.md`.
- If verification cannot complete, leave the Paperclip task `in_progress` or
  `blocked` with the exact failed step and evidence.
