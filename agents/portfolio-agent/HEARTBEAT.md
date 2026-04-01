# portfolio-agent — Heartbeat Procedure

The portfolio-agent runs when the EC2-B daily cron dispatch fires and on manual
portfolio-analysis tasks. Its job is to scan active projects, assess health,
and produce actionable recommendations without taking unapproved action on
behalf of employees.

## Execution Plan

### 1. Identity And Freshness

- Load `SOUL.md`
- Load `skills/deal-flow/SKILL.md`
- Load `skills/resource-map/SKILL.md`
- Capture the current date for overdue and stall calculations

### 2. Get Work

- If this run was triggered from a specific project request, prioritize that
  scope first
- Use shared `task_list` for the daily full sweep of active portfolio projects
- If the run was triggered for a specific project, narrow scope to that
  single project instead of scanning the whole portfolio
- Group projects by current owner / employee when preparing digests

### 3. Load Project Context

For each project, collect:

- Current issue fields, labels, assignee, and stage markers via `task_get`
- Recent comments, subtasks, and due dates
- Last 30 days of relevant `event_log` context from Mimir
- New sourcing or matching updates that affect the project

When parallel subagents help with project scans:

- Batch them in groups of 5-10 projects
- Keep each subagent project-scoped; no cross-project synthesis in child runs
- Require JSON-only output that matches
  `contracts/per-project-scan-output.schema.json`
- Use `contracts/SUBAGENT_CONTRACT.md` as the parent prompt contract

### 4. Assess Health

For each project, calculate:

- Days since last meaningful activity
- Days spent in current stage
- Whether the current `deal-flow` exit criteria are met
- Whether a follow-up date has passed
- Whether the project is blocked on another dependency

Assign one health status:

- `on_track`
- `needs_attention`
- `at_risk`
- `overdue`
- `blocked`

### 5. Generate Recommendations

Create recommendations in four buckets:

- Follow-up reminders
- Stage advancement or rollback suggestions
- Resource introductions and support options
- Concrete action plans with owner, deadline, and expected outcome

Rules:

- Use `resource-map` before suggesting external help
- Use `list_resources` when the next step depends on accelerator assets,
  introductions, or partner programs
- Name the specific person, program, or portfolio company when possible
- Keep recommendations actionable in one move
- Batch project analysis when subagents help, but keep final synthesis in this
  agent
- Use `generate_plan` for complex projects that need a multi-step action plan.
  Kick it off early, keep scanning other projects, and collect the result before
  notification assembly when possible.
- If `generate_plan` stalls or times out, fall back to a short recommendation
  that points the employee to the dashboard review instead of blocking the whole
  digest batch.

### 6. Aggregate By Employee

- Group project updates by employee
- Separate urgent items from routine updates
- Merge only `ok` and `partial` subagent outputs; keep blocked project results
  isolated and visible in the final summary
- Deduplicate repeated recommendations for the same project before building the
  digest sections
- Build a Board summary with:
  - project counts by stage
  - health distribution
  - top action items
  - newly blocked or newly advanced projects

### 7. Persist State Changes To Mimir

Before sending notifications, persist meaningful state changes so future
heartbeats and other agents can see project health history.

Store a Mimir entry when any of these events occur:

- `health_change`: health status changed since last recorded assessment
- `stage_change`: project moved to a different pipeline stage
- `overdue_followup`: a follow-up date passed without action
- `stall_detected`: no meaningful activity for 14+ days
- `blocker_identified`: new external dependency blocks the project
- `milestone_reached`: significant milestone completed

Do NOT store routine "still on track" assessments.

Write entries to `contracts/mimir-store.schema.json` shape. For each entry:

1. Set `store_status=pending`
2. Draft `memory_text`:
   ```
   Project: <name> (<id>)
   Event: <event_type>
   Stage: <stage> | Health: <previous> → <current>
   Owner: <owner>
   Days inactive: <N> | Days in stage: <N>
   Evidence: <concrete trigger — facts, not opinions>
   Recommendation: <action suggested to owner>
   ```
3. Call `memory_store` tool
4. On success: `store_status=stored`, record `memory_id`
5. On failure: `store_status=failed`, record error — do not stop the batch

All entries use `confidence=high`, `source=agent_curated`.

### 8. Notify And Update

- Format cards with `skills/feishu-format/SKILL.md`
- Build notify payloads with `contracts/feishu-notify.schema.json`
- Use `prompts/FEISHU_NOTIFY_PLAYBOOK.md` for daily digests, urgent alerts, and
  Board summaries
- Use shared `notify` to deliver `type="portfolio_update"` payloads after local
  schema validation
- Send urgent alerts immediately for overdue or high-risk items, then deliver
  the normal daily digests
- Include only schema-valid button actions. `feishu-bot` owns callback routing
  and will convert confirmed button clicks into Paperclip tasks for this agent
- Do not call `schedule_followup` until an employee confirms or the workflow
  explicitly requires automatic task creation
- Comment on the triggering Paperclip task with a concise summary when needed

### 9. Exit

- Report projects scanned, urgent items, and blockers
- Report any deferred plan generations or notify failures without hiding the
  rest of the batch outcome
- Emit end-of-heartbeat counters in `contracts/heartbeat-metrics.json` shape so
  the run summary stays machine-readable
- Leave the task `in_progress` when more implementation remains
- Mark `blocked` only when a concrete dependency prevents progress
