# Agent Communication Protocol

This document defines how SSG Lab agents hand work to each other through
Paperclip while Mimir remains the system of record for memory and evidence.

## Chain of Responsibility

Primary trigger chain:

1. `feishu-bot` receives or clarifies the employee request
2. `sourcing-agent` discovers or enriches candidate entities
3. `matching-agent` evaluates candidate relationships and actionable matches
4. `portfolio-agent` rolls qualified results into project follow-up and digest

Control plane:

- Paperclip issues, comments, and documents carry assignment state, review
  state, and structured handoff payloads

Data plane:

- Mimir stores entities, event logs, relations, evidence, and durable match
  history

## Comment Format Standard

Every actionable inter-agent comment should include:

- A short status line
- Flat bullets for what changed or what is blocked
- Links to the source issue, result document, or related task when available
- One fenced `json` block that carries the machine-readable payload

Recommended comment skeleton:

~~~md
## Update

Prepared a matching handoff for the next agent.

- Source issue: [MIM-413](/MIM/issues/MIM-413)
- Result document: [result](/MIM/issues/MIM-413#document-result)
- Next owner: [portfolio-agent](/MIM/agents/portfolio-agent)

```json
{
  "schema_version": "1.0",
  "message_type": "agent_handoff",
  "from_agent": "matching-agent",
  "to_agent": "portfolio-agent",
  "source_issue": "MIM-413",
  "source_comment_id": "comment-id",
  "project_id": "project-id",
  "requested_action": "prepare_digest",
  "priority": "high",
  "dedup_key": "portfolio:project-id:match-id",
  "paperclip_refs": {
    "result_document": "/MIM/issues/MIM-413#document-result"
  },
  "mimir_refs": {
    "match_ids": ["match-id"]
  },
  "notes": ["Only HIGH and MEDIUM matches included."]
}
```
~~~

## JSON Block Standard

Required fields for every structured handoff block:

- `schema_version` — currently `1.0`
- `message_type` — one of `agent_handoff`, `result_ready`, `blocked`,
  `digest_input`
- `from_agent`
- `to_agent`
- `source_issue`
- `requested_action`
- `priority`
- `dedup_key`

Recommended optional fields:

- `source_comment_id`
- `project_id`
- `project_name`
- `entity_ids`
- `event_log_ids`
- `paperclip_refs`
- `mimir_refs`
- `notes`

Rules:

- Keep the JSON block compact and deterministic
- Use stable ids, not only display names
- Do not hide required routing data inside prose
- If the payload changes materially, update the `dedup_key`

## Handoff Rules By Agent

### feishu-bot -> sourcing-agent

- Use when a user asks to discover people, companies, or opportunities
- Create or update the sourcing task first
- Include the original employee intent, thesis, language context, and urgency
- Mention `@sourcing-agent` only when immediate wake-up is needed

### sourcing-agent -> matching-agent

- Handoff only after candidate data is stored in Mimir or a Paperclip result
  document exists
- Include candidate ids, company ids, relevant event log ids, and the reason a
  match pass is warranted
- Do not ask matching-agent to parse raw browse traces or screenshots

### matching-agent -> portfolio-agent

- Handoff only after match records are stored in Mimir and mirrored to
  Paperclip when required
- Include match ids, match confidence tiers, and the intended next action
- Only HIGH and MEDIUM matches should move downstream

### portfolio-agent -> human follow-up

- Summaries should group by project owner and urgency
- If a human decision is required, keep the recommendation in Paperclip and the
  digest payload aligned

## @mention Trigger Rules

- Mention another agent only when that agent needs to wake up now
- Do not use mentions for passive FYI updates
- Mention only after the underlying state is committed to Mimir or Paperclip
- Prefer one target agent per comment to avoid duplicate wake-ups
- If an issue is already assigned and no immediate wake-up is required, update
  the issue without an `@mention`
- Do not repeat the same mention on a blocked thread unless new context exists

## Failure and Retry Rules

- If upstream data is incomplete, post a `blocked` payload and name the missing
  dependency
- If downstream delivery fails after Mimir was updated, do not roll back Mimir;
  retry the Paperclip handoff
- If the same payload is resent, reuse the same `dedup_key` so receivers can
  ignore duplicates
