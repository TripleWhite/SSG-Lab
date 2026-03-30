# Phase 3: Matching Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When complementary information exists across employees, projects, or accelerator resources, detect and notify within 30 minutes.

**Architecture:** Matching Agent runs inside OpenClaw on EC2-B. Triggered by Paperclip heartbeat every 30 minutes + event trigger on new Mimir content. Uses Mimir graph traversal to find complementary entities, scores matches, deduplicates against previously reported matches, and sends Feishu notifications (HIGH confidence to group chat immediately, MEDIUM confidence batched daily to Board).

**Depends on:** Phase 1 (data pipeline, memory-mimir with tools), Phase 2 (sourcing data in Mimir)

> **2026-03-30 shipped note:** The current verified runtime tree is `/home/ubuntu/.openclaw/agents/matching-agent/`, with a restore snapshot at `/home/ubuntu/.openclaw/agents/matching-agent.release.20260330202111.tgz`. The board alias `board.ssgaccelerator.com` currently resolves to `ssg-agent-system`, so do not use that DNS name to infer the matching-agent host. The checklist below is still the original implementation plan, but the concrete paths and local Paperclip port have been updated to match the deployed environment.

---

## Project References

- **Design Spec**: `/Users/arthur/Desktop/SSGLAB/ssg-accelerator-agent-system-design.md` (sections 5, 8 matching-agent, 9)
- **Agent Dir**: `/home/ubuntu/.openclaw/agents/matching-agent/`
- **LLM Model**: MiniMax M2.7 (fast, good at Chinese/English, lower cost — matching is frequent)
- **Mimir Graph API**: `POST /api/v1/graph/traverse`
- **6 Match Types**: supply-demand, resource, talent, investor, cross-project, mentor

---

## Task 1: Write matching-agent SOUL.md + HEARTBEAT.md

**Goal:** Define the 6 match types, confidence scoring, graph traversal strategy.

- [ ] **Step 1: Create SOUL.md**

Write to `/home/ubuntu/.openclaw/agents/matching-agent/SOUL.md`:

```markdown
# matching-agent — Cross-Employee, Cross-Project Connection Discovery

## Mission
Find connections across employees, projects, and accelerator resources.
You are the connective tissue of the entire accelerator operation.

## Principles

1. **Quality over quantity.** A false match wastes more time than a missed one.
   Both sides of a match must be specific enough to act on.

2. **Confidence scoring.**
   - HIGH (>80%): Both sides are specific, actionable, and verified
   - MEDIUM (60-80%): Plausible connection, may need human verification
   - Below 60%: Do not report — noise outweighs signal

3. **Always attribute source.** Every match must name which employee,
   which project, and which information led to the discovery.

4. **Think in graphs, not lists.** Follow chains of relationships.
   "Founder needs X" → traverse → "Employee has connection to X provider"
   → traverse → "Provider offers program for startups"

5. **Dedup against history.** Never report the same match twice.
   Check Mimir for existing match relations before reporting.

## Match Types (6 categories)

### 1. Supply-Demand
Portfolio company A needs customers ↔ Portfolio company B or external company offers that service.
Signal: event_logs containing "needs", "looking for", "evaluating", "seeking" paired with "offers", "provides", "building", "selling".

### 2. Resource
Founder needs specific resource ↔ Accelerator has that resource.
Signal: founder needs (credits, office space, legal, accounting) matched against accelerator resource graph (employee connections, partner programs).

### 3. Talent
Founder needs team member ↔ Accelerator talent pool has candidates.
Signal: "hiring", "looking for CTO/engineer/designer" matched against talent pool entities.

### 4. Investor
Founder raising round ↔ LP interested in that vertical/stage.
Signal: "raising", "seed round", "Series A" matched against LP entities with investment interests.

### 5. Cross-Project
Portfolio company A's capability ↔ Portfolio company B's need (synergy).
Signal: company A's product/tech can serve company B's use case. Both are portfolio companies.

### 6. Mentor
Founder's bottleneck ↔ Mentor's expertise area.
Signal: "struggling with", "need help with" matched against mentor expertise entities.

## Resource Graph (accelerator's own assets)

Search these entity types when looking for resource/talent/investor/mentor matches:
- Employee connections: HAS_CONNECTION relations
- LP/investor profiles: INTERESTED_IN relations
- Mentor profiles: EXPERT_IN relations
- Partner programs: OFFERS relations
- Portfolio company capabilities: CAN_PROVIDE relations
```

- [ ] **Step 2: Create HEARTBEAT.md**

Write to `/home/ubuntu/.openclaw/agents/matching-agent/HEARTBEAT.md`:

```markdown
# Matching Agent Heartbeat

## Execution Plan

### 1. Identity & Context
- Load SOUL.md (6 match types, scoring framework)
- Get timestamp of last successful heartbeat

### 2. Get New Content
- memory_search for event_logs created since last heartbeat
- Prioritize agent_curated (HIGH confidence) items over auto_extracted
- If no new content since last heartbeat, exit early (save tokens)

### 3. Extract Needs and Offers
For each new event_log:
- Extract "needs": what does this entity/project need?
- Extract "offers": what does this entity/project provide?
- Classify by match type potential (supply-demand, resource, talent, etc.)

### 4. Match Analysis (6 types in parallel)

#### 4a. Supply-Demand
- For each "need", graph_traverse to find complementary "offers" across other projects
- Score: specificity of need × specificity of offer × recency

#### 4b. Resource
- For each founder "need", graph_traverse the accelerator resource graph
- Check: employee connections, partner programs, cloud credits
- Score: need specificity × resource availability × employee willingness

#### 4c. Talent
- For each hiring need, search talent pool entities
- Score: skill match × experience level × availability signals

#### 4d. Investor
- For each fundraising signal, search LP entities by vertical + stage
- Score: vertical match × stage match × LP activity level

#### 4e. Cross-Project
- For each project capability, search other projects for matching needs
- Score: capability relevance × project health × actionability

#### 4f. Mentor
- For each bottleneck/struggle, search mentor expertise entities
- Score: expertise match × mentor availability × bottleneck severity

### 5. Dedup & Filter
- For each potential match, check Mimir for existing MATCH_FOUND relations
- If match already reported, skip
- Filter out matches below 60% confidence
- Sort remaining by confidence descending

### 6. Notify
- HIGH confidence (>80%): Send to Feishu group chat immediately
  - Interactive card with [View Task] [Dismiss] (task auto-created by `store_match`)
- MEDIUM confidence (60-80%): Queue for daily batch digest to Board
  - Sent as consolidated card at end of day

### 7. Store & Track
- Store confirmed matches as Mimir relations: MATCH_FOUND (sideA, sideB, type, confidence)
- Create Paperclip tasks for actionable HIGH matches
- Log match metrics: count, types, confidence distribution

### 8. Exit
- Report: matches found (by type), new content processed, skipped (dedup/low-confidence)
- Comment on Paperclip heartbeat run
- Shutdown until next heartbeat
```

- [ ] **Step 3: Verify SOUL.md and HEARTBEAT.md load**

```bash
journalctl -u openclaw-gateway -n 50 --no-pager | grep "matching-agent.*SOUL"
```

---

## Task 2: Implement Tool Handlers

**Goal:** Register matching-specific tools: graph_traverse, compare_entities, resource_match.

- [ ] **Step 1: Configure graph_traverse tool**

```json
{
  "name": "graph_traverse",
  "description": "Traverse the Mimir entity-relation graph to find connected entities. Start from an entity and follow relations of specified types to find matches.",
  "input_schema": {
    "type": "object",
    "properties": {
      "start_entity": { "type": "string", "description": "Entity name to start traversal from" },
      "relation_types": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Relation types to follow (e.g., NEEDS_CUSTOMER, HAS_CONNECTION, EXPERT_IN)"
      },
      "max_depth": { "type": "integer", "description": "Maximum traversal depth (default 2, max 4)" },
      "entity_types": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Filter target entities by type (e.g., company, person, program)"
      }
    },
    "required": ["start_entity"]
  }
}
```

Implementation: Calls Mimir `/api/v1/graph/traverse` endpoint.

- [ ] **Step 2: Configure compare_entities tool**

```json
{
  "name": "compare_entities",
  "description": "Compare two entities to score potential match quality. Analyzes complementary needs/offers, domain overlap, and actionability.",
  "input_schema": {
    "type": "object",
    "properties": {
      "entity_a": { "type": "string", "description": "First entity name or ID" },
      "entity_b": { "type": "string", "description": "Second entity name or ID" },
      "match_type": {
        "type": "string",
        "enum": ["supply-demand", "resource", "talent", "investor", "cross-project", "mentor"],
        "description": "Type of match to evaluate"
      }
    },
    "required": ["entity_a", "entity_b", "match_type"]
  }
}
```

Implementation: LLM-based comparison — fetches both entity profiles from Mimir, prompts the model to score match quality with reasoning.

- [ ] **Step 3: Configure resource_match tool**

```json
{
  "name": "resource_match",
  "description": "Search the accelerator resource graph for resources matching a founder's need. Searches employee connections, partner programs, LP interests, and mentor expertise.",
  "input_schema": {
    "type": "object",
    "properties": {
      "need": { "type": "string", "description": "What the founder/project needs" },
      "resource_types": {
        "type": "array",
        "items": { "type": "string", "enum": ["connection", "credits", "investor", "mentor", "talent", "legal", "office"] },
        "description": "Types of resources to search for"
      }
    },
    "required": ["need"]
  }
}
```

Implementation: Combines memory_search + graph_traverse — searches resource entities and traverses their relations to find applicable programs/connections.

---

## Task 3: Implement Matching Logic

**Goal:** For each new Mimir entry, extract needs/offers, traverse graph, score matches, dedup.

- [ ] **Step 1: Implement need/offer extraction**

When processing a new event_log, the agent extracts:

```
Input event_log: "DesignAI founder needs enterprise customers. Product is AI design tool."

Extracted:
  needs: ["enterprise customers for AI design tool"]
  offers: ["AI-powered design tool product"]
  entity: DesignAI
  source_employee: Alice
```

This is done by the LLM in the agent loop — no separate extraction step needed. The HEARTBEAT.md guides the agent to think about needs/offers for each event_log.

- [ ] **Step 2: Implement graph traversal matching**

For each extracted "need":
1. Call `graph_traverse` starting from related entities
2. Follow relation types: NEEDS_CUSTOMER, EVALUATING, LOOKING_FOR, HAS_CONNECTION, OFFERS
3. Collect candidate matches from traversal results

```
Example:
  Need: "enterprise customers for AI design tool"
  graph_traverse(start="DesignAI", relation_types=["NEEDS_CUSTOMER"])
  → find entities connected to "AI design" or "enterprise design tool"
  graph_traverse(start="design tool", relation_types=["EVALUATING", "LOOKING_FOR"])
  → find "BigCorp evaluating AI design solutions" (from Bob's input)
  → Match candidate: DesignAI ↔ BigCorp (supply-demand)
```

- [ ] **Step 3: Implement confidence scoring**

For each match candidate, call `compare_entities` to get a confidence score:

Scoring dimensions:
- **Specificity** (0-25): How specific are both sides? "Needs customers" is vague; "Needs enterprise customers for AI design tool" is specific.
- **Complementarity** (0-25): How well do the two sides complement each other? Direct need ↔ offer = 25; tangential = 10.
- **Recency** (0-25): How recent is the information? This week = 25; this month = 15; older = 5.
- **Actionability** (0-25): Can someone act on this match? Clear next step = 25; vague connection = 5.

Total: 0-100. Map to HIGH/MEDIUM/LOW per SOUL.md thresholds.

- [ ] **Step 4: Implement dedup against previous matches**

Before reporting any match:
1. Search Mimir for existing `MATCH_FOUND` relations between the two entities
2. If found with same match type, skip (already reported)
3. If found with different match type, report as additional connection
4. Use entity name fuzzy matching to catch variations ("DesignAI" vs "Design AI")

- [ ] **Step 5: Test matching logic with known data**

Seed Mimir with the DesignAI/BigCorp scenario from the design spec:
1. Alice inputs: "DesignAI needs enterprise customers"
2. Bob inputs: "BigCorp evaluating AI design solutions"
3. Run matching agent heartbeat
4. Verify: match found, confidence > 80%, correct attribution

---

## Task 4: Wire Paperclip Heartbeat

**Goal:** Matching agent runs every 30 minutes + event trigger on new Mimir content.

- [ ] **Step 1: Verify 30-minute heartbeat schedule**

Configured in Phase 1 Task 2. Verify:
```bash
curl "http://127.0.0.1:3100/api/companies/$COMPANY_ID/agents/matching-agent/heartbeats" \
  -H "Authorization: Bearer $API_KEY"
```

- [ ] **Step 2: Implement early exit on no new content**

If no new event_logs since last heartbeat, the agent should:
1. Check Mimir for new content (memory_search with timestamp filter)
2. If no new content, log "No new content — skipping scan" and exit
3. Save tokens — matching is frequent (every 30min), most runs will have no new content

- [ ] **Step 3: Implement event trigger**

When feishu-bot stores new content in Mimir (via memory_store), optionally trigger an immediate matching scan:

Option A (recommended): Let the 30-minute heartbeat handle it. Latency is acceptable (max 30 min).
Option B (faster): Paperclip webhook on Mimir ingest → immediate heartbeat trigger.

Start with Option A. If users need faster matching, implement Option B later.

- [ ] **Step 4: Verify heartbeat → scan → results flow**

```bash
# Watch heartbeat runs
curl "http://127.0.0.1:3100/api/companies/$COMPANY_ID/agents/matching-agent/heartbeat_runs?limit=5" \
  -H "Authorization: Bearer $API_KEY"
```

---

## Task 5: Implement Feishu Notifications

**Goal:** HIGH confidence matches → group chat immediately. MEDIUM confidence → daily batch to Board.

### 5a: HIGH Confidence Notifications

- [ ] **Step 1: Create match notification card template**

Write to `/home/ubuntu/.openclaw/agents/matching-agent/skills/feishu-format/SKILL.md`:

```markdown
# Match Notification Card Template

## Group Chat (HIGH confidence, immediate)

### Header
Match Found — [match type]

### Body
**[Entity A]** ([source employee A])
[Description A]

↔

**[Entity B]** ([source employee B])
[Description B]

**Confidence:** [score]%
**Suggestion:** [specific actionable suggestion]

### Buttons
[View Task] — opens the auto-created Paperclip follow-up task
[Dismiss] — marks match as dismissed (logged for analytics)
```

- [ ] **Step 2: Implement immediate notification for HIGH matches**

When a match scores > 80%:
1. Format using card template
2. Send to SSG group chat via Feishu API
3. Store match relation in Mimir: `MATCH_FOUND(EntityA, EntityB, type, confidence, suggestion)`
4. Create Paperclip issue (type: match) for tracking

- [ ] **Step 3: Implement button callbacks**

- **[View Task]**: Opens the Paperclip follow-up task auto-created by `store_match` (`create_task: true` for HIGH matches)
- **[Dismiss]**: Updates match status to "dismissed" in Paperclip, logs reason for analytics

### 5b: MEDIUM Confidence Batch

- [ ] **Step 4: Implement daily batch for MEDIUM matches**

Matches scoring 60-80% are queued and sent once daily to Board:
1. Store MEDIUM matches in Paperclip as issues (type: match, status: in_review)
2. At end of day (or during portfolio agent daily run), send consolidated card to Board:

```
Daily Match Digest — [N] potential matches

1. [Entity A] ↔ [Entity B] — [type] — [confidence]%
2. ...

[Review on Dashboard]
```

- [ ] **Step 5: Test both notification paths**

Test HIGH: Create data that produces > 80% match → verify group chat notification.
Test MEDIUM: Create data that produces 60-80% match → verify daily batch.

---

## Task 6: Store Matches as Mimir Relations + Paperclip Tasks

**Goal:** Every reported match is persisted for dedup, analytics, and Dashboard display.

- [ ] **Step 1: Store match relations in Mimir**

For each reported match:
```json
{
  "type": "relation",
  "source": "EntityA",
  "target": "EntityB",
  "relation_type": "MATCH_FOUND",
  "fact": "DesignAI needs enterprise customers; BigCorp evaluating AI design solutions. Suggested: introduce DesignAI founder to BigCorp design lead.",
  "metadata": {
    "match_type": "supply-demand",
    "confidence": 92,
    "source_employees": ["Alice", "Bob"],
    "status": "pending"
  }
}
```

- [ ] **Step 2: Create Paperclip issues for actionable matches**

For HIGH confidence matches:
```bash
curl -X POST "http://127.0.0.1:3100/api/companies/$COMPANY_ID/issues" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "match",
    "title": "Match: DesignAI ↔ BigCorp (supply-demand, 92%)",
    "description": "DesignAI needs enterprise customers. BigCorp evaluating AI design solutions. Suggest: introduce founders.",
    "assignee": "Alice",
    "priority": "high",
    "metadata": {
      "matchType": "supply-demand",
      "confidence": 92,
      "sideA": "DesignAI",
      "sideB": "BigCorp"
    }
  }'
```

---

## Task 7: Implement Analytics Logging

**Goal:** Track match quality metrics for Dashboard analytics page.

- [ ] **Step 1: Log match metrics per heartbeat**

After each heartbeat, comment on the Paperclip heartbeat_run with:
```json
{
  "metrics": {
    "new_content_processed": 5,
    "matches_found": 2,
    "by_type": { "supply-demand": 1, "resource": 1 },
    "by_confidence": { "HIGH": 1, "MEDIUM": 1 },
    "skipped_dedup": 3,
    "skipped_low_confidence": 7,
    "tokens_used": 4200
  }
}
```

- [ ] **Step 2: Implement weekly precision tracking**

Track accepted vs dismissed matches:
- Accepted (task actioned — not dismissed) = true positive
- Dismissed (user clicked [Dismiss]) = false positive
- Precision = accepted / (accepted + dismissed)
- Target: > 50% precision

- [ ] **Step 3: Implement match type distribution tracking**

Over time, track which match types are most common and most accepted:
```
supply-demand: 45% of matches, 60% accepted
resource: 25% of matches, 80% accepted
investor: 15% of matches, 40% accepted
...
```

This data feeds into the Dashboard `/analytics` page.

---

## Task 8: Write Matching Skill

**Goal:** Codify the match taxonomy, scoring framework, and thresholds as a loadable skill.

- [ ] **Step 1: Create matching skill**

Write to `/home/ubuntu/.openclaw/agents/matching-agent/skills/matching/SKILL.md`:

```markdown
# Matching Skill

## Match Taxonomy

| Type | Signal Words (Need Side) | Signal Words (Offer Side) |
|------|--------------------------|---------------------------|
| supply-demand | needs customers, looking for users, seeking partners | offers service, building product, selling to |
| resource | needs credits, needs office, needs legal help | has connection to, partner with, offers program |
| talent | hiring, looking for CTO/engineer, building team | experienced in, available, seeking opportunity |
| investor | raising round, fundraising, seeking investment | interested in investing, LP in, angel in |
| cross-project | needs technology X, needs distribution | builds technology X, has user base |
| mentor | struggling with, need advice on, stuck on | expert in, 15+ years in, mentor for |

## Scoring Rubric

### Specificity (0-25)
- 25: Both sides name specific entities, numbers, or deliverables
- 15: One side specific, other general
- 5: Both sides vague

### Complementarity (0-25)
- 25: Direct need ↔ offer match (A needs X, B provides X)
- 15: Related but not direct (A needs X, B provides Y which enables X)
- 5: Tangential connection

### Recency (0-25)
- 25: Both inputs within last 7 days
- 15: At least one input within last 30 days
- 5: Both inputs older than 30 days

### Actionability (0-25)
- 25: Clear next step (introduce person A to person B)
- 15: Requires research before action
- 5: Interesting connection but no clear action

## Dedup Rules
- Same two entities + same match type = duplicate (skip)
- Same two entities + different match type = new match (report)
- Entity name fuzzy match threshold: 85% similarity
```

---

## Task 9: End-to-End Test

**Goal:** Verify complete matching pipeline from employee inputs to group chat notification.

- [ ] **Step 1: Seed test data**

Employee A (Alice) inputs via Feishu:
```
Just spoke with DesignAI founder. They need enterprise customers for their
AI design tool. Product is solid, 500 MAU, demo stage.
```

Wait 5 seconds. Employee B (Bob) inputs via Feishu:
```
Saw an interesting post — MegaCorp's design team is frustrated with current
tools and actively evaluating AI design solutions.
```

- [ ] **Step 2: Trigger matching heartbeat**

Either wait for next 30-minute heartbeat or trigger manually:
```bash
curl -X POST "http://127.0.0.1:3100/api/companies/$COMPANY_ID/agents/matching-agent/heartbeats/trigger" \
  -H "Authorization: Bearer $API_KEY"
```

- [ ] **Step 3: Verify match detection**

Check OpenClaw logs for matching agent activity:
```bash
journalctl -u openclaw-gateway -n 50 --no-pager | grep "matching-agent.*match"
```

Expected: Agent detects supply-demand match between DesignAI and MegaCorp.

- [ ] **Step 4: Verify Feishu group chat notification**

The SSG group chat should receive:
```
Match Found — supply-demand

DesignAI (via Alice)
Needs enterprise customers for AI design tool

↔

MegaCorp (via Bob)
Evaluating AI design solutions for design team

Confidence: 92%
Suggestion: Introduce DesignAI founder Zhang Wei to MegaCorp design lead.

[View Task] [Dismiss]
```

- [ ] **Step 5: Verify Mimir relation stored**

```bash
curl "$MIMIR_URL/api/v1/search?user_id=system&query=DesignAI+MegaCorp+MATCH_FOUND&method=full" \
  -H "Authorization: Bearer $API_KEY"
```

- [ ] **Step 6: Verify Paperclip issue created**

```bash
curl "http://127.0.0.1:3100/api/companies/$COMPANY_ID/issues?type=match" \
  -H "Authorization: Bearer $API_KEY"
```

- [ ] **Step 7: Test button callbacks**

Verify [View Task] on the Feishu card opens the auto-created Paperclip task.
Tap [Dismiss] on another card → verify match status updated.

- [ ] **Step 8: Measure latency**

Time from Bob's input to group chat notification:
- Target: < 30 minutes (next heartbeat cycle)
- Ideal: < 5 minutes if event trigger is implemented

---

## Phase 3 Completion Checklist

After all 9 tasks:

- [ ] matching-agent SOUL.md defines 6 match types with scoring framework
- [ ] matching-agent HEARTBEAT.md defines full scan-match-notify execution plan
- [ ] 3 tool handlers registered (graph_traverse, store_match, send_feishu_card)
- [ ] Need/offer extraction works for new event_logs
- [ ] Graph traversal finds complementary entities across the Mimir graph
- [ ] Confidence scoring uses 4-dimension rubric (specificity, complementarity, recency, actionability)
- [ ] Dedup prevents duplicate match reporting
- [ ] Early exit when no new content (saves tokens on quiet periods)
- [ ] HIGH matches → Feishu group chat immediately with interactive card
- [ ] MEDIUM matches → daily batch digest to Board
- [ ] Button callbacks work: [View Task], [Dismiss]
- [ ] Matches stored as Mimir relations (MATCH_FOUND)
- [ ] Actionable matches create Paperclip issues
- [ ] Analytics logging tracks precision, type distribution, confidence distribution
- [ ] Matching skill codifies taxonomy and scoring rubric
- [ ] End-to-end: two complementary inputs → match notification in < 30 minutes

---

## Next Phase

Phase 4 (Portfolio Agent) uses the match data, project pipeline, and resource graph to generate daily digests, follow-up reminders, and action plans for each employee.
