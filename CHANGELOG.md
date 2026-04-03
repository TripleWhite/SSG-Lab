# Changelog

## 2026-04-03

### Added

- You can now mirror Company, sourcing, and match records into the dashboard's Supabase tables through `POST /api/dash-sync`.
- You can now call the workspace-local `dash_sync` tool from `feishu-bot` so Mimir captures can flow into Dash without a manual backfill step.

### Changed

- You can now keep project upserts idempotent across `upsert_project`, `upsert_sourcing`, and `upsert_match` by reusing an existing project id when the same project name already exists.
- You can now rely on the release assets to document the shared `DASH_SYNC_API_KEY` and `SSGLAB_API_URL` runtime requirements for Vercel and EC2-B.

## 2026-03-31

### Added

- You can now open `https://dash.ssgaccelerator.com/login` and start the Feishu OAuth flow from the deployed dashboard shell.
- You can now use the Phase 5 dashboard routes with live Paperclip and Mimir integrations, board-only Analytics and Settings pages, and honest empty states where live sourcing or matching feeds are not wired yet.

### Changed

- The production Feishu sign-in CTA now navigates directly to `/api/auth/feishu`, which fixes the broken login handoff from the earlier deploy.

## 2026-03-30

### Added

- You can now pin OpenClaw bootstraps to a tag or commit SHA through `OPENCLAW_REPO_REF` for reproducible EC2-B rollouts.

### Changed

- Feishu sign-in now completes the OIDC code exchange through the required `app_access_token` flow before fetching user info.
- You can now verify the Phase 3 matching-agent deploy against the real `/home/ubuntu/.openclaw/agents/matching-agent/` runtime path and restore snapshot, and the docs note that `board.ssgaccelerator.com` currently resolves to `ssg-agent-system`.

## 2026-03-29

### Added

- You can now open `https://board.ssgaccelerator.com` to reach the Paperclip control plane running on EC2-B behind Caddy.
- You can now run the four-agent OpenClaw runtime (`feishu-bot`, `sourcing-agent`, `portfolio-agent`, `matching-agent`) as a host systemd service with explicit per-agent session keys.
- You can now use the `memory-mimir` hybrid design documented here: passive recall/capture plus `memory_store`, `memory_search`, `memory_graph`, `memory_update`, and `memory_delete`.
- You can now use the shipped Feishu gateway docs from `agents/feishu-bot/`.

### Changed

- Phase 1 no longer depends on Mimir server schema work. The existing EC2-A deployment and importance-based ranking remain the live backend.
- Phase 1 deployment docs now point at the actual EC2-B bootstrap scripts and systemd services instead of the earlier Docker-only plan.
- You can now rely on EC2-B exposing only `22` and `443` publicly while Paperclip and OpenClaw stay loopback-only behind Caddy. The binary Caddy unit now runs as `caddy`.

### Known Follow-Up

- QA still needs one real Feishu -> Mimir re-test after the post-deploy OpenClaw fix.
- Production resource-graph seeding still needs real SSG data or a narrowed acceptance criterion.
- Infra review follow-ups still remain around credential rotation and board-host write exposure.
