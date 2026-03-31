# Matching Agent Heartbeat

Run every 30 minutes. Each heartbeat scans for new content in Mimir,
dispatches project-scoped matching subagents, aggregates cross-project
signals in the parent, scores potential matches, deduplicates, and notifies.

## Tools Available

**memory-mimir plugin** (standard operations):
- `memory_search` — search entities and event_logs by query
- `memory_graph` — basic entity graph exploration (entities, hops, max_results)
- `memory_store` — store new entities and notes
- `memory_update` — update existing entity attributes
- `memory_delete` — delete or tombstone entities

**Custom tools** (matching-specific):
- `graph_traverse` — filtered graph traversal with relation_types and
  entity_types filters (calls Mimir /api/v1/graph/traverse)
- `store_match` — persist MATCH_FOUND relation in Mimir; structured Paperclip
  result issues are written separately after the Mimir write succeeds
- `send_feishu_card` — send interactive card to SSG Feishu group chat

## Contracts

- `contracts/SUBAGENT_CONTRACT.md` — parent-to-subagent prompt contract for
  per-project matching
- `contracts/per-project-match-output.schema.json` — required JSON output for
  each project subagent
- `contracts/feishu-notify.schema.json` — required shape for
  `send_feishu_card` payloads
- `contracts/mimir-match.schema.json` — heartbeat result record schema
  (aggregate output, NOT the `store_match` per-match input)
- `contracts/match-result.json` — match result output schema with
  4-dimension confidence scoring
- `contracts/heartbeat-metrics.json` — per-heartbeat reporting schema
- `skills/matching/SKILL.md` — 6 match type taxonomy, scoring rubric, dedup
  rules
- `skills/feishu-format/SKILL.md` — card template for group chat and digest

## Execution Plan

### 1. Identity and Context

- Load `SOUL.md` (6 match types, scoring rubric, dedup rules)
- Get timestamp of last successful heartbeat from Paperclip run history
- If this is the first run, use 24 hours ago as baseline

### 2. Check for New Content

- `memory_search` for event_logs created since last heartbeat
- Prioritize `agent_curated` (HIGH confidence) items over `auto_extracted`
- **Early exit:** If no new content since last heartbeat, log "No new
  content - skipping scan" and exit. Save tokens on quiet periods.

### 3. Get Active Projects and Local Context

- Build the active project list from the Paperclip projects API first; fall
  back to Mimir project entities only when Paperclip is incomplete
- For each active project, collect:
  - `project_id` and project metadata
  - `project_entities` tied to that project
  - `recent_event_logs` since the last successful heartbeat
  - `dedup_existing` keys already known for that project
- Skip projects with no fresh signals, but still report them in heartbeat
  metrics
- Treat the project as the isolation boundary for subagent context

### 4. Dispatch Per-Project Matching Subagents

- Spawn one subagent per active project using
  `contracts/SUBAGENT_CONTRACT.md`
- Hard cap concurrency at 5 subagents at a time. If more than 5 projects are
  active, process them in batches of 5
- Pass only project-scoped input into each subagent:
  - `project_id`
  - `project_entities`
  - `recent_event_logs`
  - `match_types`
  - `dedup_existing`
- Each subagent should:
  - extract project-local needs, offers, blockers, and capabilities
  - use the unchanged scoring rubric from `skills/matching/SKILL.md`
  - emit only project-scoped matches plus `cross_project_signals`
  - return JSON only matching
    `contracts/per-project-match-output.schema.json`
  - set `status=partial` or `status=blocked` with `notes` when tools or
    inputs fail
- Failure isolation is mandatory:
  - one blocked project must not stop the rest of the batch
  - log failed project ids in the heartbeat comment
  - retry failed projects on the next heartbeat

### 5. Aggregate Subagent Results and Run Cross-Project Matching

- Merge `matches` from all successful project subagents
- Collect `cross_project_signals` from every project and compare them in the
  parent to discover cross-project supply-demand, capability, mentor,
  resource, talent, and investor opportunities
- Only the parent emits final `cross-project` matches. Project subagents
  never finalize cross-project pairs on their own
- Preserve the existing four-dimension scoring model and the same thresholds:
  - HIGH > 80
  - MEDIUM 60-80
  - below 60 discarded
- Preserve source attribution back to the originating project, entity,
  employee, and event_log
- Pass the aggregated match set to the dedup and storage steps below

### 6. Dedup and Filter

For each aggregated match:

1. `memory_search` for existing MATCH_FOUND relations between the two entities
2. If match already reported with same type -> skip
3. If match already reported with different type -> report as an additional
   connection
4. Filter out matches below 60% confidence
5. Sort remaining by confidence descending

### 7. Store

For each match above 60% confidence, call `store_match` with the single-match
payload defined by the tool's `input_schema` in settings.json:

```json
{
  "match_id": "{entity_a_id}:{entity_b_id}:{match_type}",
  "match_type": "supply-demand",
  "entity_a": { "id": "...", "name": "...", "source_employee": "..." },
  "entity_b": { "id": "...", "name": "...", "source_employee": "..." },
  "confidence": 85,
  "confidence_level": "HIGH",
  "scoring": {
    "specificity": 22,
    "complementarity": 20,
    "recency": 23,
    "actionability": 20
  },
  "summary": "...",
  "suggested_action": "...",
  "create_task": false
}
```

- Require runtime env before any Paperclip result write:
  - `PAPERCLIP_API_URL`
  - `PAPERCLIP_COMPANY_ID`
  - `PAPERCLIP_MATCHING_PARENT_ISSUE_ID`
  - `PAPERCLIP_API_KEY` when Paperclip auth is enabled
- Call `store_match` first so Mimir remains the source-of-truth write for
  dedup, analytics, and relation storage
- Set `create_task: false` for the dashboard feed path. If a separate Board
  follow-up issue is needed for a HIGH match, create it only after the
  structured result issue exists
- After the Mimir write succeeds, mirror every HIGH and MEDIUM match to
  Paperclip as a child issue under `PAPERCLIP_MATCHING_PARENT_ISSUE_ID`
- Treat `match_id` as the stable dedup key. If a child issue under
  `PAPERCLIP_MATCHING_PARENT_ISSUE_ID` already represents that `match_id`,
  update it instead of creating a duplicate
- Issue title format: `Match: {side_a.entity} ↔ {side_b.entity}`
- Issue status mapping:
  - `pending -> todo`
  - `accepted -> done`
  - `dismissed -> cancelled`
- Write or update the Paperclip document with:
  - `PUT /api/issues/{issueId}/documents/result`
  - `format: "json"`
  - `body`: `{"Match": {...}}`
- The `Match` JSON must match the dashboard contract:
  - `id`
  - `type`
  - `confidence`
  - `sideA`
  - `sideB`
  - `suggestion`
  - `status`
  - `createdAt`
- Map the match sides to the dashboard shape:
  - `sideA.entity`
  - `sideA.description`
  - `sideA.sourceEmployee`
  - `sideB.entity`
  - `sideB.description`
  - `sideB.sourceEmployee`
- When updating an existing `result` document, fetch it first and pass its
  `latestRevisionId` as `baseRevisionId`
- Paperclip writes are best-effort only. If the structured mirror fails, log
  the failure and continue; do not roll back the Mimir relation

**Note:** `contracts/mimir-match.schema.json` defines the **heartbeat result
record** - the aggregate batch output logged after all matches are processed.
It is NOT the per-match `store_match` input. The `store_match` tool accepts
one match at a time per its `input_schema`.

### 8. Notify

**HIGH confidence (>80%) only:** Call `send_feishu_card` to send an
immediate notification to the SSG Feishu group chat.

- Ensure the structured Paperclip result issue already exists before sending
  the Feishu card so the operator can open the same record from the
  notification

Payload must conform to `contracts/feishu-notify.schema.json`:

```json
{
  "card_type": "immediate",
  "chat_id": "<ssg-group-chat-id>",
  "header": {
    "title": "Match Found - supply-demand",
    "template": "green"
  },
  "matches": [
    {
      "match_type": "supply-demand",
      "entity_a": {
        "name": "...",
        "description": "...",
        "source_employee": "..."
      },
      "entity_b": {
        "name": "...",
        "description": "...",
        "source_employee": "..."
      },
      "confidence": 85,
      "scoring_breakdown": {
        "specificity": 22,
        "complementarity": 20,
        "recency": 23,
        "actionability": 20
      },
      "suggested_action": "Introduce Entity A founder to Entity B via Employee X"
    }
  ],
  "buttons": [
    { "text": "View Match", "action": "view_details" },
    { "text": "Dismiss", "action": "dismiss" }
  ]
}
```

**MEDIUM confidence (60-80%):** No individual Feishu notification. MEDIUM
matches are stored in Mimir (step 7) and surfaced by portfolio-agent in its
daily digest. Do not call `send_feishu_card` for MEDIUM matches.

### 9. Exit

Report in Paperclip heartbeat comment:
- New content processed: [count]
- Projects scanned: [count]
- Projects failed or deferred: [count]
- Matches found: [count] (HIGH: [n], MEDIUM: [n])
- By type: supply-demand [n], resource [n], talent [n], investor [n],
  cross-project [n], mentor [n]
- Skipped (dedup): [count]
- Skipped (low confidence): [count]
- Notifications sent: [count] (HIGH matches only)
- Structured result issues created or updated: [count]
