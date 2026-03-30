# Changelog

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
