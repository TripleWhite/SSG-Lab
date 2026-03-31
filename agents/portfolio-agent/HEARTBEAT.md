# portfolio-agent — Heartbeat Procedure

The portfolio-agent runs on a daily schedule and on manual portfolio-analysis
tasks. Its job is to scan active projects, assess health, and produce actionable
recommendations without taking unapproved action on behalf of employees.

## Execution Plan

### 1. Identity And Freshness

- Load `SOUL.md`
- Load `skills/deal-flow/SKILL.md`
- Load `skills/resource-map/SKILL.md`
- Capture the current date for overdue and stall calculations

### 2. Get Work

- Check Paperclip inbox and prioritize assigned portfolio tasks first
- Build the list of active portfolio projects from Paperclip
- Group projects by current owner / employee when preparing digests

### 3. Load Project Context

For each project, collect:

- Current issue fields, labels, assignee, and stage markers from Paperclip
- Recent comments, subtasks, and due dates
- Last 30 days of relevant `event_log` context from Mimir
- New sourcing or matching updates that affect the project

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
- Name the specific person, program, or portfolio company when possible
- Keep recommendations actionable in one move
- Batch project analysis when subagents help, but keep final synthesis in this
  agent

### 6. Aggregate By Employee

- Group project updates by employee
- Separate urgent items from routine updates
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
- Send a daily digest per employee in Feishu
- Send urgent alerts immediately for overdue or high-risk items
- Do not create Paperclip follow-up tasks until the employee confirms or the
  workflow explicitly requires automatic task creation
- Comment on the triggering Paperclip task with a concise summary when needed

### 9. Exit

- Report projects scanned, urgent items, and blockers
- Leave the task `in_progress` when more implementation remains
- Mark `blocked` only when a concrete dependency prevents progress
