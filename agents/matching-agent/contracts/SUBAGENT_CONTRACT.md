# Matching Per-Project Subagent Contract

Use this contract when the matching-agent spawns any project-specific
matching subagent.

## Parent Prompt Template

Every subagent prompt should fill in this template:

```text
You are the matching subagent for SSG Accelerator project [project_name]
([project_id]).

Project context:
- Project ID: [project_id]
- Project name: [project_name]
- Project summary: [one paragraph]
- Project entities: [compact structured payload]
- Recent event logs: [compact structured payload]
- Existing dedup keys: [match ids already known for this project]

Assignment:
- Analyze only the assigned project as the local context boundary.
- Use the standard match types: [match_types].
- Keep the scoring rubric from skills/matching/SKILL.md unchanged.
- Return project-scoped matches plus cross_project_signals for the parent.
- Return JSON only.
- Do not include markdown fences or commentary.

Requirements:
- Treat assigned project entities as Side A or local source context.
- Do not emit final `cross-project` matches. Emit reusable
  `cross_project_signals` instead.
- Keep only matches with `confidence.total >= 60`.
- Preserve source attribution to entity ids, employee names, and event_log ids
  when known.
- Set `status=partial` when some tools fail but partial output is still valid.
- Set `status=blocked` when the project cannot be analyzed.
- Put uncertainty and retry hints in `notes`, not as prose outside JSON.

Output schema:
- Output must match contracts/per-project-match-output.schema.json.
```

## Input Contract

The parent must provide these inputs:

- `project_id` — stable project identifier for the isolated unit of work
- `project_entities` — entities tied to the assigned project and relevant to
  matching
- `recent_event_logs` — recent project-specific memory or activity signals
- `match_types` — allowed match categories from the matching taxonomy
- `dedup_existing` — known match ids or stable dedup keys that should not be
  recreated

## Shared Output Rules

- `status` must be one of: `ok`, `partial`, `blocked`, `no_new_content`
- `matches` must be sorted by `confidence.total` descending
- `matches[].match_type` is limited to project-scoped categories:
  `supply-demand`, `resource`, `talent`, `investor`, `mentor`
- `cross_project_signals` are hints for the parent aggregator. They are not
  final matches
- `metrics` must report entity scan count, event log scan count, and match
  totals even when output is partial
- `notes` should explain ambiguity, missing data, or retry instructions

## Timeout and Failure Handling

- A subagent should usually finish within 10 minutes
- The parent may treat any run that exceeds 15 minutes as failed for this
  heartbeat
- One blocked project must not affect sibling projects in the same batch
- If blocked, return empty `matches` and `cross_project_signals`, populate
  `blocked_reason`, and keep metrics honest

## Parent Aggregation Handoff

- The parent merges `matches` from successful project subagents
- The parent alone compares `cross_project_signals` across projects and emits
  final `cross-project` matches
- The parent handles final dedup, Mimir writes, Paperclip mirrors, and Feishu
  notifications
