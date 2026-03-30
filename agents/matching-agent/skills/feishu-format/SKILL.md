# Match Notification Card Template

## Group Chat Card (HIGH confidence, immediate)

### Header
Match Found — [match type]

### Body
**[Entity A]** (via [Source Employee A])
[Description A — what they need or offer]

↔

**[Entity B]** (via [Source Employee B])
[Description B — what they need or offer]

**Confidence:** [score]%
**Suggestion:** [specific actionable suggestion]

### Buttons
- [View Task] — opens the auto-created Paperclip follow-up task (created by `store_match` with `create_task: true`)
- [Dismiss] — marks match as dismissed (logged for analytics)

## Daily Digest Card (MEDIUM confidence, batched)

### Header
Daily Match Digest — [N] potential matches

### Body
1. [Entity A] ↔ [Entity B] — [type] — [confidence]%
2. [Entity C] ↔ [Entity D] — [type] — [confidence]%
...

### Footer
[Review on Dashboard]
