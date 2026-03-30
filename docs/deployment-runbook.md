# EC2-B Deployment Runbook

## What Is Live

- `board.ssgaccelerator.com` terminates TLS in Caddy and reverse proxies to Paperclip on `127.0.0.1:3100`.
- The binary-fallback `caddy.service` runs as `User=caddy` / `Group=caddy`.
- Paperclip runs as `paperclip.service` from `@paperclipai/server@2026.325.0` with embedded Postgres, local encrypted secrets, and a 30 second heartbeat scheduler.
- OpenClaw runs from source as `openclaw-gateway.service` on `127.0.0.1:18789` with its control UI at `http://127.0.0.1:18789/openclaw/`.
- The EC2-B security group exposes only `22` and `443` publicly. Paperclip (`3100`) and OpenClaw (`18789`) stay loopback-only.
- Mimir stays on EC2-A at `https://api.allinmimir.com`.
- Feishu is wired in websocket mode through `feishu-bot`.

## Bootstrap Order

1. Provision EC2-B with [`scripts/release/provision-ec2b.sh`](../scripts/release/provision-ec2b.sh).
2. Install Paperclip, embedded Postgres, Caddy, and the runtime env with [`scripts/release/bootstrap-paperclip-host.sh`](../scripts/release/bootstrap-paperclip-host.sh).
3. Build OpenClaw from source and install the gateway service with [`scripts/release/bootstrap-openclaw-host.sh`](../scripts/release/bootstrap-openclaw-host.sh).
4. Seed the company and OpenClaw-backed agent records with [`scripts/release/seed-ssg-company.sh`](../scripts/release/seed-ssg-company.sh).

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
- Agent workspaces: `/home/ec2-user/openclaw-agents/{feishu-bot,sourcing-agent,portfolio-agent,matching-agent}`

## Required Runtime Details

- Paperclip binds to loopback on `127.0.0.1:3100`.
- OpenClaw binds to loopback on `127.0.0.1:18789`.
- Caddy is the only intended public ingress layer for the board host.
- `caddy.service` must report `User=caddy` and `Group=caddy`.
- Public ingress on the EC2-B security group should be limited to `22` and `443`.
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
- `systemctl show caddy` reports `User=caddy` and `Group=caddy`.
- AWS security group ingress shows only `22` and `443` as public rules.
- All three services are `active (running)`.

## Known Follow-Up Items

- Completed 2026-03-29: EC2-B public ingress is limited to `22` and `443`; `3000` and `18789` are no longer internet-reachable.
- Completed 2026-03-29: the binary-fallback `caddy.service` now runs as `User=caddy` / `Group=caddy`.
- Rotate any credential that was ever pasted into issue comments or other long-lived logs.
- Close the review-reported anonymous write exposure on the board management API before calling the deployment production-ready.
- Re-run the real Feishu -> Mimir E2E checklist after the OpenClaw session-key fix and after deciding whether to seed real SSG data or narrow the resource-graph acceptance criteria.
- Replace the placeholder entries in [`data/resource-graph-seed.json`](../data/resource-graph-seed.json) before using resource-graph search in production.
