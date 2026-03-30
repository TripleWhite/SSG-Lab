# Matching Agent Heartbeat

Run every 30 minutes. Each heartbeat scans for new content in Mimir,
extracts needs/offers, traverses the entity graph, scores potential
matches, deduplicates, and notifies.

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

For each extracted need, search for complementary offers across the graph:

#### 4a. Supply-Demand
- `memory_graph` from need entity, follow NEEDS_CUSTOMER, EVALUATING
- `memory_search` for entities offering matching products/services
- Score: specificity of need × specificity of offer × recency

#### 4b. Resource
- `memory_graph` from founder need, traverse accelerator resource graph
- Check: employee connections, partner programs, cloud credits
- Score: need specificity × resource availability × employee willingness

#### 4c. Talent
- For hiring needs, `memory_search` talent pool entities
- Score: skill match × experience level × availability signals

#### 4d. Investor
- For fundraising signals, `memory_search` LP entities by vertical + stage
- Score: vertical match × stage match × LP activity level

#### 4e. Cross-Project
- For each project capability, search other projects for matching needs
- Score: capability relevance × project health × actionability

#### 4f. Mentor
- For bottleneck/struggle signals, search mentor expertise entities
- Score: expertise match × mentor availability × bottleneck severity

### 5. Dedup and Filter

For each potential match:

1. `memory_search` for existing MATCH_FOUND relations between the two entities
2. If match already reported with same type → skip
3. If match already reported with different type → report as additional connection
4. Filter out matches below 60% confidence
5. Sort remaining by confidence descending

### 6. Notify

**HIGH confidence (>80%):** Send to Feishu group chat immediately.

Format as interactive card:
```
Match Found — [match type]

[Entity A] (via [Source Employee A])
[Description A]

↔

[Entity B] (via [Source Employee B])
[Description B]

Confidence: [score]%
Suggestion: [specific actionable suggestion]

[Create Task] [Dismiss] [Details]
```

**MEDIUM confidence (60-80%):** Queue for daily batch digest.

Store as Paperclip issue (status: pending_review) for the daily portfolio
agent digest. Do not send individual notifications for MEDIUM matches.

### 7. Store and Track

For each reported match:

- Store Mimir relation: `MATCH_FOUND(EntityA, EntityB, type, confidence)`
- For HIGH matches: create Paperclip issue assigned to relevant employee
- Log metrics: matches found (by type), confidence distribution, dedup skips

### 8. Exit

Report in Paperclip heartbeat comment:
- New content processed: [count]
- Matches found: [count] (HIGH: [n], MEDIUM: [n])
- By type: supply-demand [n], resource [n], talent [n], investor [n],
  cross-project [n], mentor [n]
- Skipped (dedup): [count]
- Skipped (low confidence): [count]
