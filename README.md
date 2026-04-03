# SSG-Lab

## What Lives Here

- `src/` contains the dashboard app and the live-integration work that reads from Paperclip and Mimir.
- `scripts/release/` contains the Phase 1 EC2-B bootstrap scripts for Paperclip, OpenClaw, and agent seeding.
- `agents/feishu-bot/` contains the shipped Feishu gateway identity and heartbeat docs.
- `agents/matching-agent/` contains the tracked matching-agent identity, heartbeat, OpenClaw settings, notification contracts, and Feishu notification-formatting skills.
- `docs/` contains the deployment runbook, API surface notes, memory plugin architecture, and employee usage guides.
- `plans/` contains the implementation plans and shipped-status notes for each phase.
- `data/resource-graph-seed.json` is still placeholder seed data and must be replaced before production seeding.

## Phase 1 Snapshot

- `board.ssgaccelerator.com` fronts the Paperclip control plane on EC2-B through Caddy.
- `board.ssgaccelerator.com` currently resolves to `ssg-agent-system`; do not assume that DNS name identifies the host carrying the matching-agent runtime artifacts.
- EC2-B public ingress is limited to `22` and `443`; Paperclip (`127.0.0.1:3100`) and OpenClaw (`127.0.0.1:18789`) stay loopback-only behind Caddy.
- The binary-fallback `caddy.service` runs as `User=caddy` / `Group=caddy`. After moving Caddy storage to that user, the first restart can trigger a one-time TLS reprovision.
- The OpenClaw runtime connects `feishu-bot`, `sourcing-agent`, `portfolio-agent`, and `matching-agent`.
- Matching-agent deployment evidence from `2026-03-30` points at `/home/ubuntu/.openclaw/agents/matching-agent/` with a restore snapshot at `/home/ubuntu/.openclaw/agents/matching-agent.release.20260330202111.tgz`.
- For reproducible EC2-B redeploys, set `OPENCLAW_REPO_REF` to a tag or commit SHA before running `scripts/release/bootstrap-openclaw-host.sh`.
- `memory-mimir` is currently documented at `v4.0.0-rc.1` with hybrid recall/capture plus five explicit tools.
- Mimir stays on EC2-A at `https://api.allinmimir.com`; no Phase 1 Mimir schema migration shipped.
- End-to-end verification and production resource seeding still have follow-up work. See the deployment runbook for the latest status.

## Dashboard Surface

- `https://dash.ssgaccelerator.com` is the production dashboard alias. Anonymous requests redirect to `/login`.
- `/login` shows the Feishu auth shell, current config status, required env vars, and explicit callback errors.
- Production verification on `2026-03-31` confirmed that `/login` renders a direct sign-in CTA to `/api/auth/feishu`, and `GET /api/auth/feishu` returns `307` to Feishu authorize while setting the `ssg_oauth_state` cookie.
- Signed-in users can access `/`, `/pipeline`, `/agents`, `/sourcing`, `/matching`, and `/resources`.
- `/analytics` and `/settings` are board-only. Populate `BOARD_FEISHU_OPEN_IDS` with comma-separated Feishu open IDs or emails to map those users into the `board` role.
- Overview, Pipeline, Sourcing, and Matching revalidate every 30 seconds. Agents revalidates every 15 seconds.
- `/sourcing` and `/matching` now read live Paperclip structured-result issues when the `SSG Lab` project contains `Sourcing Results` and `Matching Results` parent issues. If that project, parent issue, or `result` document is missing, the routes intentionally keep the honest empty state. `/resources` falls back to `data/resource-graph-seed.json` when Mimir is unavailable.

## Runtime Environment

- Copy `.env.example` before running the dashboard locally.
- `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, and `PAPERCLIP_COMPANY_ID` power the live Paperclip-backed routes.
- `MIMIR_API_URL`, `MIMIR_API_KEY`, and `MIMIR_USER_ID` power the resource graph and future memory-backed views.
- `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` are required for the working sign-in flow.
- `DASH_SYNC_API_KEY` secures `POST /api/dash-sync` on the dashboard deployment and must match the value used by the feishu-bot runtime.
- `SSGLAB_API_URL` is required on the EC2-B feishu-bot/OpenClaw runtime so the workspace-local `dash_sync` tool can call the deployed dashboard origin.
- `NEXTAUTH_URL` should point at the deployed dashboard origin, for example `https://dash.ssgaccelerator.com`.
- In the Feishu app config, set the homepage URL to `https://dash.ssgaccelerator.com` and the redirect URL to `https://dash.ssgaccelerator.com/api/auth/feishu`.

## Docs

- [docs/deployment-runbook.md](docs/deployment-runbook.md)
- [docs/api.md](docs/api.md)
- [docs/feishu-bot.md](docs/feishu-bot.md)
- [docs/memory-mimir-v4-architecture.md](docs/memory-mimir-v4-architecture.md)
- [CHANGELOG.md](CHANGELOG.md)
- [plans/phase1-data-pipeline.md](plans/phase1-data-pipeline.md)
- [plans/phase3-matching-agent.md](plans/phase3-matching-agent.md)
- [ssg-accelerator-agent-system-design.md](ssg-accelerator-agent-system-design.md)

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```
