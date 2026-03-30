# Phase 4: Portfolio Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every morning, each employee receives a project digest with follow-up reminders and action recommendations. Overdue items and at-risk projects get immediate notifications.

**Architecture:** Portfolio Agent runs inside OpenClaw on EC2-B. Triggered by Paperclip heartbeat daily at 9am (UTC+8) + event trigger for urgent items. Scans all active projects in Paperclip, queries Mimir for recent event_logs per project, generates recommendations based on actual accelerator resources, and sends personalized Feishu digests per employee.

**Depends on:** Phase 1 (data pipeline, resource graph), Phase 2 (sourcing data), Phase 3 (match data)

---

## Project References

- **Design Spec**: `/Users/arthur/Desktop/SSGLAB/ssg-accelerator-agent-system-design.md` (sections 5, 8 portfolio-agent, 9)
- **Agent Dir**: `/home/ec2-user/openclaw-agents/portfolio-agent/`
- **LLM Model**: MiniMax M2.7 (daily scan of 20-40 projects, cost-efficient)
- **Paperclip Pipeline**: Projects as issues with stages (contact → diligence → decision → acceleration → exit)
- **Mimir Resource Graph**: Seeded in Phase 1, continuously updated

---

## Task 1: Write portfolio-agent SOUL.md + HEARTBEAT.md

**Goal:** Define portfolio management philosophy, suggestion-only model, recommendation generation.

- [ ] **Step 1: Create SOUL.md**

Write to `/home/ec2-user/openclaw-agents/portfolio-agent/SOUL.md`:

```markdown
# portfolio-agent — Pipeline Management & Action Recommendations

## Mission
Manage the project pipeline, track stages, generate follow-up reminders,
and recommend actionable next steps — all while ensuring no follow-up is forgotten
and every project gets the attention it needs.

## Principles

1. **Be the team's memory.** No follow-up should ever be forgotten.
   Track every promise, every timeline, every action item.

2. **Recommendations must be specific and actionable.**
   BAD: "Consider following up with DesignAI."
   GOOD: "Schedule check-in with DesignAI founder Zhang Wei about Q3 enterprise
          launch. Last contact was 2 months ago. Alice can use her Sequoia connection
          to help with their fundraising."

3. **Base suggestions on actual resources.** Load the resource-map skill.
   Recommendations should reference real accelerator assets:
   employee connections, LP interests, mentor expertise, partner programs.

4. **Suggestion-only model.** Never take direct action on behalf of employees.
   Generate recommendations. Employees decide what to act on.
   Create Paperclip tasks only when employee confirms via Feishu button.

5. **Flag stuck/at-risk projects proactively.** Projects with:
   - No activity in 2+ weeks → "needs attention"
   - Overdue follow-ups → "overdue"
   - No stage advancement in 60+ days → "at risk"
   - Dependency blocked → "blocked"

## Stage Definitions

| Stage | Duration Target | Exit Criteria |
|-------|----------------|---------------|
| Contact | 1-2 weeks | Initial meeting done, team assessed |
| Diligence | 2-4 weeks | Market, product, team, financials reviewed |
| Decision | 1-2 weeks | Investment committee vote |
| Acceleration | 3-6 months | Milestones tracked, resources deployed |
| Exit | Ongoing | Graduated or discontinued |

## Health Assessment

- **On Track**: Active within last 2 weeks, stage-appropriate progress
- **Needs Attention**: No activity in 2-3 weeks, or minor delays
- **At Risk**: No activity in 4+ weeks, or major milestone missed
- **Overdue**: Specific follow-up date passed without action
```

- [ ] **Step 2: Create HEARTBEAT.md**

Write to `/home/ec2-user/openclaw-agents/portfolio-agent/HEARTBEAT.md`:

```markdown
# Portfolio Agent Heartbeat

## Execution Plan

### 1. Identity & Context
- Load SOUL.md (stage definitions, health criteria)
- Load deal-flow skill (transition criteria, playbook)
- Load resource-map skill (accelerator resources)
- Get current date for deadline calculations

### 2. Get All Active Projects
- task_list from Paperclip: all issues where type=project, status != closed
- Group projects by assigned employee
- Note: typically 20-40 active projects

### 3. Scan Each Project (subagent per project for parallelism)
For each project, spawn a subagent that:

a. **Fetch recent activity**
   - memory_search for event_logs about this project (last 30 days)
   - task_get from Paperclip for project details, comments, subtasks

b. **Assess health**
   - Days since last activity
   - Days in current stage
   - Any overdue follow-ups (check foresight entities)
   - Any unresolved dependencies

c. **Check for opportunities**
   - New matches involving this project (from matching agent)
   - Stage advancement readiness (all exit criteria met?)
   - New resources available (resource graph changes)

d. **Generate recommendations**
   - Overdue follow-ups: "Follow up with [founder] about [topic]. Last contact [date]."
   - Stage advancement: "Ready to advance to [next stage]. Criteria met: [list]."
   - Resource suggestions: "Connect [founder] with [resource]. [Employee] has this connection."
   - Action plans: numbered steps with specific people, resources, and timelines

e. **Return summary**
   - Project name, stage, health status
   - List of recommendations with priority (urgent/important/informational)
   - Follow-up reminders with dates

### 4. Aggregate Results by Employee
- Group project summaries by assigned employee
- Separate urgent items (overdue, at-risk) from routine updates
- Prepare Board summary (all projects, aggregate health)

### 5. Send Notifications

**Per-employee daily digest (Feishu 1:1):**
- Header: "Daily Project Update — [date]"
- Overdue items first (red)
- At-risk items second (yellow)
- On-track with recommendations (green)
- New matches relevant to their projects
- Action buttons per item

**Urgent items immediately (any time, not just daily):**
- Overdue follow-ups past 1 week → immediate notification
- At-risk projects with no activity in 4+ weeks → immediate notification

**Board summary (Feishu to Arthur):**
- Total active projects by stage
- Health distribution (on-track/attention/at-risk/overdue)
- Top 5 action items across all projects
- Agent performance metrics

### 6. Store & Update
- memory_store significant health changes (stage transitions, risk flags)
- Update Paperclip issue status if stage change recommended
- Create follow-up tasks in Paperclip (pending employee confirmation)

### 7. Exit
- Log: projects scanned, recommendations generated, notifications sent
- Comment on Paperclip heartbeat run
- Shutdown until next heartbeat
```

- [ ] **Step 3: Verify SOUL.md and HEARTBEAT.md load**

```bash
docker logs openclaw-gateway | grep "portfolio-agent.*SOUL"
```

---

## Task 2: Implement Tool Handlers

**Goal:** Register portfolio-specific tools: generate_plan, schedule_followup, list_resources.

- [ ] **Step 1: Configure generate_plan tool**

```json
{
  "name": "generate_plan",
  "description": "Generate an actionable plan for a project based on its current stage, health, and available accelerator resources. Returns numbered steps with specific people, resources, and timelines.",
  "input_schema": {
    "type": "object",
    "properties": {
      "project_name": { "type": "string", "description": "Project/company name" },
      "current_stage": { "type": "string", "enum": ["contact", "diligence", "decision", "acceleration", "exit"] },
      "context": { "type": "string", "description": "Recent activity, health status, and relevant information" },
      "goal": { "type": "string", "description": "What should this plan achieve? E.g., 'advance to next stage', 'resolve blocker', 'connect with resources'" }
    },
    "required": ["project_name", "current_stage", "context"]
  }
}
```

Implementation: LLM call with context about the project + resource graph. Returns structured plan with numbered steps.

- [ ] **Step 2: Configure schedule_followup tool**

```json
{
  "name": "schedule_followup",
  "description": "Create a follow-up reminder for a project. The reminder will trigger a notification when the date arrives.",
  "input_schema": {
    "type": "object",
    "properties": {
      "project_name": { "type": "string", "description": "Project/company name" },
      "follow_up_date": { "type": "string", "description": "ISO 8601 date for follow-up (e.g., 2026-04-15)" },
      "action": { "type": "string", "description": "What to do on follow-up: 'Call founder', 'Check milestone', etc." },
      "assigned_to": { "type": "string", "description": "Employee to remind" }
    },
    "required": ["project_name", "follow_up_date", "action", "assigned_to"]
  }
}
```

Implementation: Creates a Mimir foresight entity + Paperclip subtask with due date.

- [ ] **Step 3: Configure list_resources tool**

```json
{
  "name": "list_resources",
  "description": "List accelerator resources matching a specific need. Searches employee connections, partner programs, LP interests, and mentors.",
  "input_schema": {
    "type": "object",
    "properties": {
      "need": { "type": "string", "description": "What resource is needed" },
      "category": {
        "type": "string",
        "enum": ["all", "connections", "investors", "mentors", "programs", "talent"],
        "description": "Resource category to search"
      }
    },
    "required": ["need"]
  }
}
```

Implementation: Calls Mimir memory_search + graph_traverse on resource entities.

---

## Task 3: Implement Daily Scan Logic

**Goal:** Scan all active projects, assess health, check for opportunities, generate recommendations.

- [ ] **Step 1: Implement project listing from Paperclip**

```
task_list(type="project", status="open")
→ Returns 20-40 active projects with: name, stage, assignee, created_at, updated_at, tags
```

- [ ] **Step 2: Implement per-project health assessment**

For each project, calculate health score:

```
Health Assessment Algorithm:
1. days_since_activity = today - last_event_log_date
2. days_in_stage = today - stage_entered_date
3. overdue_followups = count(foresights where date < today and status != completed)
4. unresolved_blocks = count(subtasks where status == blocked)

Health status:
  if overdue_followups > 0: "overdue"
  elif days_since_activity > 28: "at-risk"
  elif days_since_activity > 14: "needs-attention"
  else: "on-track"
```

- [ ] **Step 3: Implement opportunity detection**

For each project, check:
1. **New matches**: Query Mimir for MATCH_FOUND relations involving this project (created since last scan)
2. **Stage readiness**: Check if all exit criteria for current stage are met
3. **New resources**: Check if resource graph has new entries relevant to this project's needs

- [ ] **Step 4: Implement recommendation generation**

For each finding, generate a recommendation:

```
Recommendation types:
1. OVERDUE_FOLLOWUP: "Follow up with [founder] about [topic]. Last contact [N] days ago."
2. STAGE_ADVANCE: "Ready for [next stage]. Criteria met: [list]. Next step: [action]."
3. RESOURCE_MATCH: "Connect [founder] with [resource]. [Employee] has this connection."
4. AT_RISK_WARNING: "No activity in [N] days. Suggest: [action]."
5. ACTION_PLAN: Numbered multi-step plan for complex situations.
```

Each recommendation includes:
- Priority: urgent / important / informational
- Assigned employee
- Suggested action with specific names and resources
- Related Mimir entities for context

---

## Task 4: Implement Subagent Parallel Analysis

**Goal:** Spawn subagent per project for parallel scanning (20-40 projects would be too slow sequentially).

- [ ] **Step 1: Design subagent per-project scan**

Each subagent receives:
- Project name, stage, assignee, Paperclip issue ID
- Access to memory_search, task_get, list_resources tools
- Instruction to assess health + generate recommendations

Returns:
- Health status
- List of recommendations (structured JSON)
- Follow-up reminders (structured JSON)

- [ ] **Step 2: Implement batch spawning**

Spawn subagents in batches of 5-10 to avoid overwhelming the system:
```
Batch 1: projects 1-10 (parallel subagents)
Wait for batch 1 to complete
Batch 2: projects 11-20 (parallel subagents)
...
```

- [ ] **Step 3: Implement result aggregation**

Collect all subagent results:
1. Group by assigned employee
2. Sort by priority (urgent > important > informational)
3. Dedup recommendations (same suggestion for same project = keep one)
4. Prepare per-employee digest and Board summary

- [ ] **Step 4: Test parallel scanning with 10+ projects**

Seed Paperclip with 15-20 test projects across all stages.
Run heartbeat and verify:
- All projects scanned
- Subagents complete within reasonable time (< 5 min total)
- Recommendations are accurate and specific

---

## Task 5: Write deal-flow Skill

**Goal:** Codify stage definitions, transition criteria, and playbook as a loadable skill.

- [ ] **Step 1: Create deal-flow skill**

Write to `/home/ec2-user/openclaw-agents/portfolio-agent/skills/deal-flow/SKILL.md`:

```markdown
# Deal Flow Skill

## Pipeline Stages

### Contact
**Entry**: Founder identified (sourcing or referral)
**Activities**: Initial call, team assessment, product demo
**Exit Criteria**:
- [ ] Initial meeting completed
- [ ] Team quality assessed (experience, commitment, domain expertise)
- [ ] Product/idea understood
- [ ] Market size roughly estimated
**Typical Duration**: 1-2 weeks
**Next Stage**: Diligence (if all criteria met) or Archive

### Diligence
**Entry**: Initial contact positive, worth deeper investigation
**Activities**: Market analysis, competitive landscape, financial review, reference checks
**Exit Criteria**:
- [ ] Market analysis complete (TAM, SAM, SOM)
- [ ] Competitive landscape mapped
- [ ] Financial projections reviewed (if available)
- [ ] 2+ reference checks completed
- [ ] Technical assessment done
**Typical Duration**: 2-4 weeks
**Next Stage**: Decision (if criteria met) or Contact (if need more info)

### Decision
**Entry**: Diligence complete, team recommends proceeding
**Activities**: Investment committee presentation, term sheet negotiation
**Exit Criteria**:
- [ ] Investment committee vote (majority approve)
- [ ] Term sheet agreed
- [ ] Legal review complete
**Typical Duration**: 1-2 weeks
**Next Stage**: Acceleration (if approved) or Archive

### Acceleration
**Entry**: Investment decision made, founder onboarded
**Activities**: Resource deployment, milestone tracking, regular check-ins
**Key Milestones**:
- Month 1: Onboarding complete, initial resource connections made
- Month 2: First milestone review
- Month 3: Mid-program check-in
- Month 4-6: Growth metrics tracking, follow-on preparation
**Exit Criteria**:
- [ ] Program duration complete (3-6 months)
- [ ] Key milestones achieved (or documented why not)
- [ ] Follow-on funding status determined
**Next Stage**: Exit

### Exit
**Entry**: Acceleration complete or investment decision to discontinue
**Activities**: Graduation ceremony, alumni network onboarding, or wind-down support
**Types**: Graduation (success), Pivot (redirect), Discontinue (close)

## Playbook Actions by Stage

### Contact Stage Actions
1. Schedule introductory call within 1 week
2. Share accelerator overview and expectations
3. Request pitch deck and basic financials
4. Assign primary contact (employee)

### Diligence Stage Actions
1. Assign diligence team (2 employees)
2. Schedule deep-dive sessions (product, market, financials)
3. Conduct reference checks (3 minimum)
4. Prepare investment memo

### Acceleration Stage Actions
1. Create resource deployment plan (connections, mentors, credits)
2. Set quarterly milestones with founder
3. Schedule bi-weekly check-ins
4. Connect with relevant portfolio companies (cross-project synergies)
```

---

## Task 6: Write resource-map Skill

**Goal:** Codify the accelerator's resource inventory as a loadable skill.

- [ ] **Step 1: Create resource-map skill**

Write to `/home/ec2-user/openclaw-agents/portfolio-agent/skills/resource-map/SKILL.md`:

```markdown
# Resource Map Skill

## Accelerator Resource Inventory

### Employee Connections
When generating recommendations, check if any employee has relevant connections:
- Search Mimir for employee entities with HAS_CONNECTION relations
- Match connection type against founder needs

### LP / Investor Network
For fundraising projects:
- Search Mimir for LP entities with INTERESTED_IN relations
- Match by vertical, stage, and check size
- Note: introductions require Board approval

### Mentor Network
For projects needing expertise:
- Search Mimir for mentor entities with EXPERT_IN relations
- Match expertise against founder bottlenecks
- Include mentor availability and engagement history

### Partner Programs
For resource needs:
- AWS Activate: Up to $100k cloud credits (applications accepted quarterly)
- Google for Startups: Cloud credits + GDG community access
- ZhangLaw: Incorporation, IP filing, basic legal (discounted rate)
- AccountingPro: Financial audit, tax filing (first year free)
- CoWork Space: 3 hot desks available for portfolio companies

### Portfolio Company Capabilities
For cross-project synergies:
- Search Mimir for portfolio company CAN_PROVIDE relations
- Match capabilities against needs of other portfolio companies
- Prioritize: same vertical = customer potential, different vertical = partnership potential

## Using This Skill

When generating a plan for any project:
1. Check all 5 resource categories above
2. For each matching resource, name the specific person/program
3. Include the employee who can make the introduction
4. Note any constraints (approval needed, limited availability, application deadline)
```

---

## Task 7: Implement Feishu Notifications

**Goal:** Daily digest per employee, urgent items immediately, Board summary.

### 7a: Daily Digest

- [ ] **Step 1: Create daily digest card template**

```markdown
## Daily Project Update — [date]

### Overdue (action required)
- **DesignAI** — First contact 2 months ago. Q3 enterprise launch planned.
  → Suggest: schedule check-in call with Zhang Wei.
  [Schedule Follow-up] [Snooze 1 Week]

- **RoboTech** — Demo review promised 3 weeks ago. No update.
  → Suggest: reach out to founder, offer to reschedule.
  [Schedule Follow-up] [Mark Complete]

### Ready to Advance
- **FinanceAI** — All diligence criteria met. Team liked by all.
  → Recommended action plan:
  1. Connect with LP network for co-investment interest
  2. Introduce to 3 potential enterprise clients
  3. Offer 3-month acceleration slot
  4. Draft term sheet for partner review
  [View Plan] [Modify] [Discuss]

### On Track (3 projects)
- **HealthBot** — Acceleration month 2. Milestone review next week.
- **EduTech** — Acceleration month 3. B2B sales improving.
- **LogiAI** — Acceleration month 1. Resource connections in progress.
```

- [ ] **Step 2: Implement per-employee digest generation**

For each employee:
1. Filter project summaries to their assigned projects
2. Sort: overdue first, then at-risk, then ready-to-advance, then on-track
3. Format using digest card template
4. Send via Feishu 1:1

- [ ] **Step 3: Implement action buttons**

- **[Schedule Follow-up]**: Opens date picker → creates foresight + Paperclip subtask
- **[Snooze 1 Week]**: Postpones follow-up reminder by 7 days
- **[Mark Complete]**: Marks the follow-up as completed
- **[View Plan]**: Opens full action plan on Dashboard
- **[Modify]**: Prompts employee to edit the plan in Feishu
- **[Discuss]**: Creates a discussion thread in Feishu

### 7b: Urgent Notifications

- [ ] **Step 4: Implement immediate urgent notifications**

Urgent criteria (send immediately, not just daily):
- Follow-up overdue by 7+ days
- Project at-risk (no activity 4+ weeks)
- Critical match found (from matching agent)
- Blocked dependency unresolved for 1+ week

Format: single-item card with clear action needed.

### 7c: Board Summary

- [ ] **Step 5: Implement Board summary**

Daily summary to Arthur:
```markdown
## SSG Portfolio Summary — [date]

**38 active projects** across 5 stages:
Contact: 12 | Diligence: 8 | Decision: 3 | Acceleration: 15 | Exit: 4

**Health:** 25 on-track | 8 needs-attention | 3 at-risk | 2 overdue

**Top 5 Action Items:**
1. DesignAI: follow-up overdue (2 months, Alice)
2. RoboTech: demo review pending (3 weeks, Bob)
3. FinanceAI: ready for investment decision (Carol)
4. LogiAI: needs mentor connection for GTM (Eve)
5. DataFlow: new resource match (Carol)

**This Week:** 12 new insights, 3 matches found, 2 stage advancements

[View Dashboard]
```

---

## Task 8: Wire Paperclip Heartbeat

**Goal:** Portfolio agent runs daily at 9am + event trigger for urgent items.

- [ ] **Step 1: Verify daily heartbeat schedule**

Configured in Phase 1 Task 2 (cron: `0 1 * * *` = 9am UTC+8). Verify:
```bash
curl "http://localhost:3000/api/companies/$COMPANY_ID/agents/portfolio-agent/heartbeats" \
  -H "Authorization: Bearer $API_KEY"
```

- [ ] **Step 2: Implement event trigger for urgent items**

When matching agent finds a HIGH confidence match, or when an overdue threshold is crossed, trigger an immediate portfolio agent scan for that specific project (not full daily scan):

```bash
# Triggered by Paperclip event
curl -X POST "http://localhost:3000/api/companies/$COMPANY_ID/agents/portfolio-agent/heartbeats/trigger" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope": "project", "project_id": "<specific-project>"}'
```

- [ ] **Step 3: Verify daily heartbeat → full scan → digests**

Run a full heartbeat and check:
1. All active projects scanned
2. Recommendations generated per project
3. Per-employee digests sent via Feishu
4. Board summary sent to Arthur
5. Heartbeat run logged in Paperclip

---

## Task 9: Implement Background Tasks for generate_plan

**Goal:** Long-running plan generation runs in background thread, agent continues other work.

- [ ] **Step 1: Identify long-running operations**

`generate_plan` may take 10-30 seconds for complex projects (multiple LLM calls for resource matching + plan generation). With 20-40 projects, sequential generation would take too long.

- [ ] **Step 2: Implement background task pattern**

Use OpenClaw background task mechanism:
1. Agent kicks off `generate_plan` as background task
2. Agent continues to next project
3. Background task notification injected before next LLM call
4. Agent collects completed plan results

This allows parallel plan generation across projects.

- [ ] **Step 3: Implement timeout and fallback**

If `generate_plan` times out (> 60 seconds):
1. Use a simpler recommendation: "Project [name] needs attention. Review on Dashboard."
2. Log timeout for monitoring
3. Don't block the entire daily digest for one slow plan

---

## Task 10: End-to-End Test

**Goal:** Daily heartbeat fires, scans all projects, sends personalized digests to all employees.

- [ ] **Step 1: Seed realistic test data**

In Paperclip, create 15-20 projects across all stages:
- 3 in Contact stage (various health levels)
- 4 in Diligence stage (1 overdue)
- 2 in Decision stage (1 ready to advance)
- 6 in Acceleration stage (various health levels)
- 2 in Exit stage

In Mimir, create event_logs for each project with varying recency.

- [ ] **Step 2: Trigger daily heartbeat**

```bash
curl -X POST "http://localhost:3000/api/companies/$COMPANY_ID/agents/portfolio-agent/heartbeats/trigger" \
  -H "Authorization: Bearer $API_KEY"
```

- [ ] **Step 3: Verify per-employee digests**

Check each employee received a digest with:
- Only their assigned projects
- Correct health assessments
- Actionable recommendations with specific resources
- Working action buttons

- [ ] **Step 4: Verify Board summary**

Check Arthur received:
- All projects summarized
- Correct aggregate health stats
- Top 5 action items
- Working Dashboard link

- [ ] **Step 5: Verify urgent notifications**

For the overdue project:
- Immediate notification sent (not just in daily digest)
- Urgent tone with clear action needed

- [ ] **Step 6: Measure performance**

- Total scan time for all projects: target < 10 minutes
- Per-project scan time: target < 30 seconds average
- Digest delivery: all employees within 5 minutes of heartbeat completion
- Recommendation quality: spot-check 5 recommendations for specificity and accuracy

---

## Phase 4 Completion Checklist

After all 10 tasks:

- [ ] portfolio-agent SOUL.md defines suggestion-only management philosophy
- [ ] portfolio-agent HEARTBEAT.md defines daily scan + recommendation generation
- [ ] 3 tool handlers registered (generate_plan, schedule_followup, list_resources)
- [ ] Daily scan processes all 20-40 active projects
- [ ] Health assessment correctly classifies on-track/attention/at-risk/overdue
- [ ] Recommendations reference actual accelerator resources (not generic advice)
- [ ] Subagent parallel scanning handles 20-40 projects efficiently (< 10 min)
- [ ] deal-flow skill defines stage definitions and transition criteria
- [ ] resource-map skill catalogs accelerator resources
- [ ] Per-employee Feishu digests show only their projects, sorted by priority
- [ ] Urgent items get immediate notification (not just daily digest)
- [ ] Board summary provides aggregate view with top action items
- [ ] Action buttons work: Schedule, Snooze, Mark Complete, View Plan, Modify
- [ ] Follow-up reminders create foresight entities + Paperclip subtasks
- [ ] Background tasks handle long-running plan generation without blocking
- [ ] Daily heartbeat at 9am + event trigger for urgent items
- [ ] End-to-end: heartbeat → scan → digests arrive at 9am

---

## Next Phase

Phase 5 (Dashboard Integration) replaces all demo data in the Dashboard with live data from Paperclip + Mimir APIs. The Portfolio Agent's data (project health, recommendations, follow-ups) feeds directly into the Pipeline and Overview dashboard pages.
