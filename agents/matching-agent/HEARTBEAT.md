# Matching Agent Heartbeat

Run every 30 minutes. Each heartbeat scans for new content in Mimir,
extracts needs/offers, traverses the entity graph, scores potential
matches, deduplicates, and notifies.

## Tools Available

**memory-mimir plugin** (standard operations):
- `memory_search` — search entities and event_logs by query
- `memory_graph` — basic entity graph exploration (entities, hops, max_results)
- `memory_store` — store new entities and notes
- `memory_update` — update existing entity attributes
- `memory_delete` — delete or tombstone entities

**Custom tools** (matching-specific):
- `graph_traverse` — filtered graph traversal with relation_types and entity_types filters (calls Mimir /api/v1/graph/traverse)
- `store_match` — persist MATCH_FOUND relation in Mimir + optionally create Paperclip follow-up issue
- `send_feishu_card` — send interactive card to SSG Feishu group chat

## Contracts

- `contracts/feishu-notify.schema.json` — required shape for `send_feishu_card` payloads
- `contracts/mimir-match.schema.json` — heartbeat result record schema (aggregate output, NOT the `store_match` per-match input)
- `contracts/match-result.json` — match result output schema with 4-dimension confidence scoring
- `contracts/heartbeat-metrics.json` — per-heartbeat reporting schema
- `skills/matching/SKILL.md` — 6 match type taxonomy, scoring rubric, dedup rules
- `skills/feishu-format/SKILL.md` — card template for group chat and digest

## Execution Plan

### 1. Identity and Context

- Load SOUL.md (6 match types, scoring rubric, dedup rules)
- Get timestamp of last successful heartbeat from Paperclip run history
- If this is the first run, use 24 hours ago as baseline

### 2. Check for New Content

- `memory_search` for event_logs created since last heartbeat
- Prioritize `agent_curated` (HIGH confidence) items over `auto_extracted`
- **Early exit:** If no new content since last heartbeat, log "No new
  content — skipping scan" and exit. Save tokens on quiet periods.

### 3. Extract Needs and Offers

For each new event_log:

- **Needs:** What does this entity or project need?
  (customers, resources, talent, investment, technology, advice)
- **Offers:** What does this entity or project provide?
  (products, services, expertise, connections, capital)
- **Classify** by match type potential (supply-demand, resource, talent,
  investor, cross-project, mentor)

### 4. Match Analysis (all 6 types)

For each extracted need, search for complementary offers across the graph.
Use `graph_traverse` for relation-filtered traversal and `memory_search`
for keyword-based entity lookup.

#### 4a. Supply-Demand
- `graph_traverse` from need entity with `relation_types: ["NEEDS_CUSTOMER", "EVALUATING"]`
- `memory_search` for entities offering matching products/services
- Score: specificity of need x specificity of offer x recency

#### 4b. Resource
- `graph_traverse` from founder need with `entity_types: ["program", "partner", "resource"]`
- Check: employee connections, partner programs, cloud credits
- Score: need specificity x resource availability x employee willingness

#### 4c. Talent
- `memory_search` talent pool entities by skill keywords
- `graph_traverse` with `relation_types: ["WORKS_AT", "EXPERT_IN"]` to find network connections
- Score: skill match x experience level x availability signals

#### 4d. Investor
- `graph_traverse` with `relation_types: ["INVESTED_IN", "INTERESTED_IN"]` and `entity_types: ["company", "fund"]`
- `memory_search` LP entities by vertical and stage keywords
- Score: vertical match x stage match x LP activity level

#### 4e. Cross-Project
- `graph_traverse` from project entity with `relation_types: ["CAN_PROVIDE", "NEEDS"]`
- For each project capability, search other projects for matching needs
- Score: capability relevance x project health x actionability

#### 4f. Mentor
- `memory_search` mentor expertise entities by bottleneck keywords
- `graph_traverse` with `relation_types: ["EXPERT_IN", "MENTORS"]` and `entity_types: ["person"]`
- Score: expertise match x mentor availability x bottleneck severity

### 5. Dedup and Filter

For each potential match:

1. `memory_search` for existing MATCH_FOUND relations between the two entities
2. If match already reported with same type -> skip
3. If match already reported with different type -> report as additional connection
4. Filter out matches below 60% confidence
5. Sort remaining by confidence descending

### 6. Store

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
  "scoring": { "specificity": 22, "complementarity": 20, "recency": 23, "actionability": 20 },
  "summary": "...",
  "suggested_action": "...",
  "create_task": true
}
```

- **HIGH matches (>80%):** Set `create_task: true`. This creates a Paperclip
  follow-up issue with status `in_review` for Board action.
- **MEDIUM matches (60-80%):** Set `create_task: false`. The portfolio-agent
  includes MEDIUM matches from Mimir in its daily Board digest.

**Note:** `contracts/mimir-match.schema.json` defines the **heartbeat result
record** — the aggregate batch output logged after all matches are processed.
It is NOT the per-match `store_match` input. The `store_match` tool accepts
one match at a time per its `input_schema`.

### 7. Notify

**HIGH confidence (>80%) only:** Call `send_feishu_card` to send an
immediate notification to the SSG Feishu group chat.

Payload must conform to `contracts/feishu-notify.schema.json`:

```json
{
  "card_type": "immediate",
  "chat_id": "<ssg-group-chat-id>",
  "header": {
    "title": "Match Found — supply-demand",
    "template": "green"
  },
  "matches": [{
    "match_type": "supply-demand",
    "entity_a": { "name": "...", "description": "...", "source_employee": "..." },
    "entity_b": { "name": "...", "description": "...", "source_employee": "..." },
    "confidence": 85,
    "scoring_breakdown": { "specificity": 22, "complementarity": 20, "recency": 23, "actionability": 20 },
    "suggested_action": "Introduce Entity A founder to Entity B via Employee X"
  }],
  "buttons": [
    { "text": "View Task", "action": "view_details" },
    { "text": "Dismiss", "action": "dismiss" }
  ]
}
```

**MEDIUM confidence (60-80%):** No individual Feishu notification. MEDIUM
matches are stored in Mimir (step 6) and surfaced by portfolio-agent in
its daily digest. Do not call `send_feishu_card` for MEDIUM matches.

### 8. Exit

Report in Paperclip heartbeat comment:
- New content processed: [count]
- Matches found: [count] (HIGH: [n], MEDIUM: [n])
- By type: supply-demand [n], resource [n], talent [n], investor [n],
  cross-project [n], mentor [n]
- Skipped (dedup): [count]
- Skipped (low confidence): [count]
- Notifications sent: [count] (HIGH matches only)
- Tasks created: [count] (HIGH matches only)
