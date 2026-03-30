# SSG Accelerator — Implementation Plans

| Phase | Plan | Status | Description |
|-------|------|--------|-------------|
| 0 | [Dashboard Demo](../2026-03-29-ssg-dashboard-demo-phase0.md) | Done | Interactive dashboard at dash.ssgaccelerator.com with SSG brand, seeded demo data |
| 1 | [Data Pipeline](phase1-data-pipeline.md) | Deployed, QA follow-up | EC2-B provisioning, Paperclip + OpenClaw deployment, Feishu channel, memory-mimir redesign (restore tools + hybrid capture), resource graph seeding |
| 2 | [Sourcing Agent](phase2-sourcing-agent.md) | Planned | SOUL/HEARTBEAT, 7-platform subagent browser search (Twitter, GitHub, Reddit, LinkedIn, Xiaohongshu, WeChat, 36Kr), Feishu result cards, workspace isolation |
| 3 | [Matching Agent](phase3-matching-agent.md) | Planned | 6-type cross-employee/project/resource matching (supply-demand, resource, talent, investor, cross-project, mentor), confidence scoring, Feishu group chat notifications |
| 4 | [Portfolio Agent](phase4-portfolio-agent.md) | Planned | Daily pipeline scan, per-employee Feishu digests, follow-up reminders, action plan generation with real accelerator resources, deal-flow + resource-map skills |
| 5 | [Dashboard Integration](phase5-dashboard-integration.md) | In progress, partial ship | Overview, Pipeline, Agents, Analytics, Resources, and the Feishu auth shell now use live data or honest empty states; live sourcing and matching feeds are still pending |

## Dependency Graph

```
Phase 0 (Dashboard Demo)
    |
Phase 1 (Data Pipeline)
    |
    +--- Phase 2 (Sourcing Agent)
    |
    +--- Phase 3 (Matching Agent)
    |
    +--- Phase 4 (Portfolio Agent)
    |
    +--- Phase 5 (Dashboard Integration) — depends on all above
```

## Key Files

- **Design Spec**: [`ssg-accelerator-agent-system-design.md`](../ssg-accelerator-agent-system-design.md)
- **Phase 0 Plan**: [`2026-03-29-ssg-dashboard-demo-phase0.md`](../2026-03-29-ssg-dashboard-demo-phase0.md)
- **Phase 1 Runbook**: [`docs/deployment-runbook.md`](../docs/deployment-runbook.md)
- **API Surface**: [`docs/api.md`](../docs/api.md)
- **Feishu Guide**: [`docs/feishu-bot.md`](../docs/feishu-bot.md)
