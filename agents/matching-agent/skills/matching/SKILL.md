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

## Notification Routing

| Confidence | Action | Channel |
|------------|--------|---------|
| >80% (HIGH) | Send immediately | Feishu group chat, interactive card |
| 60-80% (MEDIUM) | Queue for digest | Daily batch to Board via portfolio-agent |
| <60% | Discard | Not reported |
