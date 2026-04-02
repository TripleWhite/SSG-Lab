# Changelog

## 2026-04-03

### Fixed

- Feishu bot private chat no longer responds with "?" to follow-up messages. When intent is ambiguous or a message references prior context (pronouns, implicit subjects, reply-to fragments), the bot now searches Mimir `event_log` for recent activity from the same channel or peer within the last 30 minutes and uses that context to re-classify intent before giving up. If context is found, the bot asks a clarifying question that references it rather than returning an unhelpful fallback.

## 2026-04-02

### Added

- You can now wire Sourcing and Matching dashboard pages to a Supabase business data layer by setting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Operational data (agents, heartbeat runs) continues to come from the Paperclip API.

### Fixed

- Sourcing, Matching, and Resources pages no longer leak internal developer text or credential error messages. Empty states now show user-friendly copy ("No sourcing data available yet", "No matching results yet") and the Resources page no longer references "Mimir" or placeholder strings directly.
- Dashboard pages no longer display Paperclip dev-internal placeholder data (issue identifiers such as SSG-103, internal team-pulse entries). The sourcing, matching, and analytics views now show honest empty states when no SSG Lab business data exists.
- Feishu bot no longer crashes with `Cannot read properties of undefined (reading 'properties')` when users @mention it in a group. The Anthropic SDK MCP helper `inputSchema` guard (originally patched in MIM-520) is now applied permanently at bootstrap time — no per-deploy manual patch required.

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
