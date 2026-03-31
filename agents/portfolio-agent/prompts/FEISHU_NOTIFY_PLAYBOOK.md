# Feishu Notify Playbook — Portfolio Agent

## Overview

This playbook defines how to build Feishu notification payloads for the three
portfolio output types: daily digest, urgent alert, and Board summary.

## Output Types

### 1. Daily Digest (`daily_digest`)

**When:** Every day at 9am UTC+8 for each employee with active projects.

**Content:**
- Employee name and active project count in the header
- Sections grouped by priority: urgent first, then high, normal, info
- Each item includes project name, stage, health, summary, recommendation
- Max 6 sections, max 8 items per section
- Footer buttons: View Dashboard, Details

**Payload:** Must validate against `contracts/feishu-notify.schema.json` with
`data.kind = "daily_digest"`.

### 2. Urgent Alert (`urgent_alert`)

**When:** Immediately when a project transitions to `overdue` or `at_risk` with
a concrete trigger (missed follow-up, extended stall, blocker).

**Content:**
- Single project focus
- Alert reason in the header
- Full recommendation with named owner and resource suggestion
- Action buttons: Schedule Follow-up, Snooze 1 Week

**Payload:** Must validate against `contracts/feishu-notify.schema.json` with
`data.kind = "urgent_alert"`.

### 3. Board Summary (`board_summary`)

**When:** Included in the daily digest run, sent to the Board channel.

**Content:**
- Headline summarizing pipeline state
- Stage counts (contact, diligence, decision, acceleration, exit)
- Health counts (on_track, needs_attention, at_risk, overdue, blocked)
- Top 5 action items with project name, owner, and summary
- Footer button: View Dashboard

**Payload:** Must validate against `contracts/feishu-notify.schema.json` with
`data.kind = "board_summary"`.

## Delivery Rules

1. Use the `target` field to route to the correct Feishu user or group.
2. Set `channel` to `"feishu"` and `type` to `"portfolio_update"`.
3. Validate every payload against the schema before sending.
4. If validation fails, log the error and skip the notification — do not send
   malformed cards.
5. Urgent alerts take priority over daily digest delivery.
6. If an employee has no actionable items, skip their digest (do not send empty
   cards).

## Card Formatting

Use `skills/feishu-format/SKILL.md` templates for card layout. Key rules:

- Keep summaries under 100 characters
- Recommendations should be one sentence with a named action and owner
- Use stage and health as visual indicators (emoji or badges)
- Buttons must map to valid `action` values in the schema
