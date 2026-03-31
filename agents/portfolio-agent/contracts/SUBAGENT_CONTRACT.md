# Portfolio Per-Project Subagent Contract

Use this contract when `portfolio-agent` fans out project analysis work to
parallel subagents during the daily scan.

## Parent Prompt Template

Every project-scoped subagent prompt should fill in this template:

```text
You are the portfolio subagent for SSG Accelerator project [project_name]
([project_id]).

Project context:
- Project ID: [project_id]
- Project name: [project_name]
- Current stage: [stage]
- Current owner: [owner]
- Current issue summary: [one paragraph]
- Recent comments and due dates: [compact structured payload]
- Recent event logs: [compact structured payload]
- Relevant matches or resource hints: [compact structured payload]

Assignment:
- Analyze only the assigned project as the local scope boundary.
- Assess project health using the portfolio-agent health model.
- Generate project-scoped recommendations and follow-up suggestions.
- Use deal-flow and resource-map guidance without changing their rules.
- Return JSON only.
- Do not include markdown fences or commentary.

Requirements:
- Set `status=partial` when some context is missing but useful output remains.
- Set `status=blocked` when the project cannot be analyzed safely.
- Sort recommendations by priority: `urgent`, `important`, `informational`.
- Put uncertainty, missing data, and retry hints in `notes`.
- Output must match `contracts/per-project-scan-output.schema.json`.
```

## Input Contract

The parent should provide:

- `project_id` — stable project identifier
- `project_name` — display name used in digests
- `stage` — current pipeline stage
- `owner` — current project owner / employee
- `recent_comments` — latest project comments, subtasks, due dates
- `recent_event_logs` — relevant Mimir activity for the last 30 days
- `resource_hints` — existing matches, resource candidates, or partner programs

## Shared Output Rules

- `status` must be one of: `ok`, `partial`, `blocked`, `no_action`
- `health` must be one of: `on_track`, `needs_attention`, `at_risk`, `overdue`,
  `blocked`
- `recommendations` must be sorted by priority and remain project-scoped
- `followups` should only include reminders that are explicit enough to act on
- `metrics` must report scanned items and totals even when output is partial
- `notes` explains ambiguity, missing context, or why the project was blocked

## Timeout and Failure Handling

- A project-scoped subagent should usually finish within 10 minutes
- The parent may treat any run that exceeds 15 minutes as failed for this
  heartbeat
- One blocked project must not affect sibling projects in the same batch
- If blocked, return empty `recommendations` and `followups`, populate
  `blocked_reason`, and keep metrics honest

## Parent Aggregation Handoff

- The parent merges subagent outputs by project owner
- The parent alone deduplicates repeated recommendations across outputs
- The parent handles final Mimir writes, Feishu notifications, and any
  Paperclip follow-up creation
