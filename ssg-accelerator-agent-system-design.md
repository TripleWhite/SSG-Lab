# SSG Accelerator Agent System — Design Specification

**Date**: 2026-03-29
**Author**: Arthur (CEO) + Claude (Architect)
**Status**: Draft — pending review

---

## Table of Contents

1. [Background & Problem Statement](#1-background--problem-statement)
2. [Vision & Goals](#2-vision--goals)
3. [User Personas & Scenarios](#3-user-personas--scenarios)
4. [Architecture Overview](#4-architecture-overview)
5. [Agent Topology](#5-agent-topology)
6. [Memory System Design](#6-memory-system-design)
7. [Agent Internals — Core Mechanisms](#7-agent-internals--core-mechanisms)
8. [Agent Identity & Heartbeat Patterns](#8-agent-identity--heartbeat-patterns)
9. [Tool & Skill System](#9-tool--skill-system)
10. [Permission Model](#10-permission-model)
11. [Feishu Interaction Design](#11-feishu-interaction-design)
12. [Dashboard Design](#12-dashboard-design)
13. [Deployment Topology](#13-deployment-topology)
14. [Cost Model](#14-cost-model)
15. [Failure & Degradation Strategy](#15-failure--degradation-strategy)
16. [Implementation Phases](#16-implementation-phases)
17. [Open Questions & Future Work](#17-open-questions--future-work)

---

## 1. Background & Problem Statement

### What is SSG Accelerator?

SSG Accelerator is an investment accelerator that sources, evaluates, and supports early-stage founders and teams. The team of 5-10 employees manages a pipeline of 20-40 active projects at any given time, with continuous sourcing of new founders.

**Website**: https://www.ssgaccelerator.com

### The Problem

The accelerator's daily operations rely heavily on manual, fragmented processes:

**Information silos.** Employees use different tools (Notion, Feishu, WeChat, etc.) to capture meeting notes, articles, insights, and founder interactions. This information is scattered across personal workflows with no unified system for storage, retrieval, or cross-referencing.

**Manual sourcing.** Finding founders and teams that match the accelerator's thesis requires hours of manual searching across Twitter/X, GitHub, Reddit, LinkedIn, and other platforms. This is repetitive, time-consuming, and inconsistent.

**Lost connections.** When Employee A mentions that a portfolio company needs customers, and Employee B separately mentions that another company is looking for exactly that service, the connection is invisible. These high-value matches only happen through hallway conversations — if they happen at all.

**Pipeline drift.** With 20-40 active projects, follow-ups slip through cracks. A founder met 2 months ago in demo stage never gets the promised check-in. An action plan discussed in a meeting is forgotten. No systematic tracking of what was promised, what is due, and what the accelerator can offer each founder.

**No institutional memory.** When an employee leaves or is absent, their knowledge about founder relationships, meeting context, and deal nuances leaves with them.

### Why Agents?

These problems share a pattern: they involve processing discrete, distributed information inputs and generating coordinated, timely actions across the team. This is precisely what a multi-agent system excels at — agents can continuously ingest, analyze, match, and act on information that humans struggle to keep track of manually.

---

## 2. Vision & Goals

### Vision

Build an AI agent system that serves as the accelerator's operational backbone — ingesting all employee inputs through natural conversation, finding founders on the internet, connecting dots across team members, managing the project pipeline, and proactively recommending actions — all while employees interact through their existing messaging tool (Feishu).

### Goals

| Goal | Success Criteria |
|------|-----------------|
| Unified information capture | All employee inputs (meeting notes, articles, insights, files) flow into a single memory system within 30 seconds |
| Automated sourcing | Given a thesis or insight, the system finds relevant founders/teams from 4+ platforms within hours |
| Cross-employee matching | When two employees independently mention complementary needs/capabilities, the system detects and notifies within 30 minutes |
| Pipeline management | Every active project has a current status, next action, and follow-up date. Overdue items trigger reminders |
| Actionable recommendations | For each project, the system can suggest what the accelerator can do to help, based on available resources |
| Minimal friction | Employees interact through Feishu chat only — no new tools to learn, no forms to fill |
| Management visibility | A branded dashboard shows pipeline status, agent activity, and team usage at a glance |

### Non-Goals

- Replacing investment decision-making (agents advise, humans decide)
- Automated outreach to founders (agents find and suggest, humans initiate contact)
- Real-time trading or financial operations
- General-purpose AI assistant for employees (focused on accelerator operations only)

---

## 3. User Personas & Scenarios

### Personas

**Arthur (Board / Admin)**
- Role: CEO / Managing Partner
- Needs: Full visibility into pipeline, agent performance, team activity. Controls system configuration. Presents to stakeholders.
- Interface: Dashboard (primary) + Feishu (occasional)

**Employee (5-10 people)**
- Role: Investment associates, analysts, partner relations
- Needs: Capture information effortlessly, get sourcing results, see relevant matches, receive follow-up reminders, respond to agent suggestions.
- Interface: Feishu only (1:1 chat with bot + group chat)

### Key Scenarios

**Scenario 1: Meeting Note Capture**
```
Alice finishes a call with DesignAI founder.
She opens Feishu and tells the bot:
  "Just spoke with DesignAI founder Zhang Wei. Product is solid — AI-powered
   design tool, 500 MAU, looking for enterprise customers. They're in demo
   stage, want to launch enterprise tier in Q3. Team is 4 people, based in
   Shenzhen. Zhang Wei is ex-Figma."

The bot responds: "Got it. I've recorded the meeting with DesignAI."

Behind the scenes:
- The conversation LLM (agent-as-curator) judges this as high-value
- memory_store creates in Mimir:
  - Entity: DesignAI (company, AI design tool, demo stage)
  - Entity: Zhang Wei (founder, ex-Figma, Shenzhen)
  - Relation: Alice MET_WITH Zhang Wei
  - Event_log: "Product solid, 500 MAU, needs enterprise customers, Q3 launch"
  - Foresight: "Follow up in 2 months on enterprise launch progress"
```

**Scenario 2: Cross-Employee Matching**
```
Next day, Bob tells the bot:
  "Saw an interesting post — MegaCorp's design team is frustrated with
   current tools and actively evaluating AI design solutions."

30 minutes later, the Feishu group chat receives:
  Match Found
  DesignAI (Alice's contact) needs enterprise customers
  MegaCorp (Bob's insight) evaluating AI design solutions

  Suggestion: Introduce Zhang Wei to MegaCorp's design lead.
  Related employees: Alice, Bob

  [Create Task] [Dismiss] [Details]

Alice taps [Create Task] -> Paperclip issue created automatically.
```

**Scenario 3: Sourcing Request**
```
Carol tells the bot:
  "We should be looking at AI infrastructure teams — especially
   those building LLM serving or inference optimization."

The bot responds: "I've created a sourcing task for AI infrastructure
teams focused on LLM serving/inference optimization."

4 hours later (next Sourcing Agent heartbeat):
- Sourcing Agent spawns 4 subagents (Twitter, GitHub, Reddit, LinkedIn)
- Results aggregated, deduplicated, stored in Mimir
- Carol receives in Feishu:

  Sourcing Complete: AI Infrastructure
  Found 7 candidates:
  1. NeuralOps — LLM serving, Seed, 2.3k GitHub stars — 85% match
  2. InfraAI — Inference optimization, Pre-seed, ex-NVIDIA — 78% match
  3. ...

  [View All] [Create Project for #1] [Refine Search]
```

**Scenario 4: Portfolio Management & Action Plan**
```
Every morning at 9:00, Portfolio Agent runs:
- Scans all 38 active projects
- Queries Mimir for recent event_logs per project
- Identifies overdue follow-ups, new matches, advancement opportunities

Alice receives:
  Daily Project Update

  Overdue:
  - DesignAI — First contact was 2 months ago. Q3 enterprise launch planned.
    Suggest: schedule check-in call.
  - RoboTech — Demo review promised 3 weeks ago. No update.

  Ready to advance:
  - FinanceAI — Team liked by all. Due diligence complete.
    Recommended action plan:
    1. Connect with LP network for co-investment interest
    2. Introduce to 3 potential enterprise clients
    3. Offer 3-month acceleration slot
    4. Draft term sheet for partner review

  [Schedule DesignAI Follow-up] [View FinanceAI Plan] [Snooze RoboTech]
```

**Scenario 5: Dashboard Demo for Stakeholders**
```
Arthur opens dash.ssgaccelerator.com before a board meeting:
- Pipeline view shows 38 projects across 5 stages
- Agent panel shows all 3 agents healthy, last run times
- This week: 12 new insights, 3 matches, 2 sourcing tasks done, 15 candidates
- Clicks FinanceAI card -> full timeline, meeting notes, agent recommendations
- SSG brand: mint green + lime, Space Grotesk headings, dark theme
```

---

## 4. Architecture Overview

### System Components

```
+--------------------------------------------------------------+
|                    Dashboard (Next.js, Vercel)                |
|         Admin global view + Employee personal view           |
|         SSG Brand: #62feca / #c8ff75 / #131818              |
|         dash.ssgaccelerator.com                             |
+----------+--------------------------------------+------------+
           | REST API                              |
           v                                       v
+--------------------------------------------------------------+
|                 Paperclip (Control Plane)                     |
|  +-------------+ +--------------+ +-----------------------+  |
|  | Heartbeat   | | Issue/Task   | | Agent Registry        |  |
|  | Scheduler   | | Pipeline     | | Status / Logs / Audit |  |
|  +------+------+ +------+-------+ +-----------+-----------+  |
|         |                |                     |              |
|  openclaw_gateway adapter (localhost WebSocket)               |
+---------+---------------+---------------------+--------------+
          v               v                     v
+---------------------------------------------------------------+
|          OpenClaw Gateway (Single Instance, Multi-Agent)       |
|                                                               |
|  +--------------+ +--------------+ +--------------+           |
|  | feishu-bot   | | sourcing     | | portfolio    |           |
|  | (employee    | | agent        | | agent        |           |
|  |  gateway)    | | + Browser    | | + matching   |           |
|  | Feishu bound | |              | |   agent      |           |
|  +------+-------+ +------+-------+ +------+-------+          |
|         |                |                |                   |
|  memory-mimir plugin (agent-as-curator + autoCapture fallback)|
+---------+---------------+----------------+--------------------+
          v               v                v
+---------------------------------------------------------------+
|                    Mimir (Memory Center)                       |
|            api.allinmimir.com (existing EC2-A)                |
|                                                               |
|  Graph (entities + relations) + Vector + BM25                 |
|  Entities: founder, company, employee, investor               |
|  Relations: MET_WITH, NEEDS_CUSTOMER, LOOKING_FOR, etc.       |
|  Event Logs: meeting notes, insights, articles, sourcing      |
|  Foresights: follow-up reminders, predictions                 |
|  Raw Docs: original files, images, transcripts                |
+---------------------------------------------------------------+
```

### Design Principles

1. **OpenClaw is the hands and mouth** — employee conversation + browser execution
2. **Mimir is the brain** — all information storage, retrieval, cross-referencing
3. **Paperclip is the manager** — schedules agents, tracks tasks, monitors status
4. **Dashboard is the eyes** — visualizes everything for management and employees
5. **Feishu is the only employee interface** — no new tools to learn
6. **Agent-as-curator for memory** — the conversation LLM decides what to store
7. **Suggestion-based** — all human-involving actions are recommendations needing confirmation

---

## 5. Agent Topology

### Model: Employee Gateway + Shared Functional Agents

Employees do not get individual agents. They interact through a shared Feishu bot that routes to functional agents via Paperclip task management.

```
        OpenClaw (per-employee Feishu session)
        +-- Alice's conversation -> session_alice
        +-- Bob's conversation   -> session_bob
        +-- Carol's conversation -> session_carol
                |
                | All inputs go to Mimir (by user_id)
                | Tasks created in Paperclip
                v
    +-------------------------------+
    |      Mimir (shared memory)    |
    |  Stored by user_id, cross-    |
    |  searchable across employees  |
    +---+-----------+----------+----+
        v           v          v
   Sourcing    Portfolio   Matching
   Agent       Agent       Agent
```

### Agent Roster

| Agent | Role | Trigger | Channel |
|-------|------|---------|---------|
| **feishu-bot** | Employee conversation gateway. Understands input, curates memories, creates tasks, relays results | Feishu messages (real-time) | Feishu |
| **sourcing-agent** | Searches internet for founders/teams matching thesis | Heartbeat every 4h + manual trigger | None |
| **portfolio-agent** | Manages pipeline, tracks stages, generates reminders and action plans | Heartbeat daily 9am + events | None |
| **matching-agent** | Cross-references employee inputs for supply-demand matches | Heartbeat every 30min + new content | None |

### Why Not Per-Project or Per-Employee Agents?

**Per-project agents** (20-40 agents): Most would idle — low per-project activity frequency. Cross-project analysis requires single-agent visibility. Mimir graph traversal naturally connects across projects. Portfolio Agent's daily scan is more cost-effective.

**Per-employee agents** (5-10 agents): Inputs go to shared Mimir anyway. Cross-employee matching IS the core value. One feishu-bot handles all sessions through OpenClaw multi-session architecture.

---

## 6. Memory System Design

### Core Problem with Current memory-mimir

Current architecture: fully passive, zero tools exposed to conversation LLM. autoCapture sends raw text to server pipeline. Server-side LLM extracts everything.

**Result**: High recall, lower precision. The conversation LLM — which has full context about significance, novelty, and user intent — never participates in deciding what matters.

| Metric | auto-recall only | full + structured + graph-traverse |
|--------|-----------------|-----------------------------------|
| Accuracy | 74% (50q E2E) | 91.17% (1540q LoCoMo) |

### Reference: mem9 Approach

mem9 uses 5 explicit tools (store/search/get/update/delete) + 3 lifecycle hooks. The conversation LLM decides what to store. Every stored memory is intentionally curated.

| Dimension | mem9 | Current Mimir |
|-----------|------|---------------|
| Capture model | Agent-as-curator | Pipeline-as-extractor |
| Decision maker | Conversation LLM (full context) | Server LLM (raw text only) |
| Precision | High | Lower |
| Recall | Lower | High |

### Redesigned Architecture: Hybrid Model

```
Employee conversation
    |
    +-- Conversation LLM actively curates (HIGH confidence)
    |   memory_store("DesignAI founder needs customers, priority high")
    |   -> Mimir stores with confidence: HIGH, source: agent_curated
    |
    +-- autoCapture still runs as fallback (MEDIUM confidence)
        -> Raw text sent to server pipeline
        -> Mimir stores with confidence: MEDIUM, source: auto_extracted

Search/retrieval:
    -> HIGH confidence items ranked first
    -> MEDIUM confidence items fill gaps
```

### Restored Memory Tools

- **memory_store**: Agent actively stores important information (HIGH confidence)
- **memory_search**: Structured query (keyword + vector + graph-traverse)
- **memory_update**: Update existing entities when new info arrives
- **memory_delete**: Soft delete with audit trail

### Lifecycle Hooks

- **before_prompt_build**: auto-recall (inject relevant memories, unchanged)
- **agent_end**: LLM final review — "anything important I should remember?"
- **before_reset**: Before compression, extract uncaptured important info

### Mimir Server Changes Required

1. Confidence/weight field on stored items
2. Source tracking: `agent_curated` vs `auto_extracted`
3. Search ranking prioritizes high-confidence items
4. Dedup: merge when autoCapture extracts something already curated

---

## 7. Agent Internals — Core Mechanisms

Based on learn-claude-code 12-step architecture:

### s01 — Agent Loop

Every agent runs the same core loop. The loop never changes.

```python
def agent_loop(messages):
    while True:
        response = LLM(model, system, messages, tools)
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return
        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS[block.name]
                output = handler(**block.input)
                results.append({"type": "tool_result",
                                "tool_use_id": block.id, "content": output})
        messages.append({"role": "user", "content": results})
```

### s02 — Tool Dispatch Map

Each agent has different tools, same dispatch mechanism. Add tool = add handler + schema. Loop unchanged.

### s03 — TodoWrite

Multi-step tasks use internal checklist. One `in_progress` at a time. Nag reminder if 3+ rounds without update.

### s04 — Subagents

Critical for Sourcing Agent. Each subagent gets clean `messages[]`, returns summary only. Parent context stays clean.

```
Sourcing Agent (parent)
+-- subagent: Twitter/X search (fresh messages[], browse tool)
+-- subagent: GitHub search (fresh messages[], github_search)
+-- subagent: Reddit search (fresh messages[], browse tool)
+-- subagent: LinkedIn search (fresh messages[], browse tool)

Parent receives 4 summaries. All browser DOM/screenshot noise discarded.
```

### s05 — Skill Loading

Layer 1 (system prompt): skill names + descriptions (~100 tokens/skill, cheap)
Layer 2 (tool_result): full skill body on demand (~2000 tokens, expensive)

Skills live on disk as `skills/<name>/SKILL.md`. Add skill = add directory. No code changes.

### s06 — Context Compaction

Layer 1 (micro): Old tool results replaced with placeholders every turn
Layer 2 (auto): Token threshold triggers LLM summarization, transcript saved to disk
Layer 3 (manual): Agent explicitly requests compression

### s07 — Task System (Pipeline as DAG)

Each project is a Paperclip issue. Advancement is a DAG with blockedBy/blocks dependencies. Completing a task auto-unblocks dependents.

### s08 — Background Tasks

Browser operations run in background threads. Agent continues other work. Notification injected before next LLM call.

### s09/s10 — Team Communication

Implicit: agents communicate through shared Mimir (write/read)
Explicit: Paperclip task creation/assignment
Urgent: direct inbox messages between agents

### s11 — Autonomous Behavior

Agents scan for unclaimed work within their domain. 60s idle with no work -> shutdown until next heartbeat.

### s12 — Workspace Isolation

Each sourcing task gets isolated workspace directory for results, screenshots, contacts. Prevents parallel task interference.

---

## 8. Agent Identity & Heartbeat Patterns

### feishu-bot SOUL.md

```
Mission: Help employees capture info, trigger tasks, relay agent results.
Principles:
- You are a gateway, not a decision-maker
- Judge what is important and memory_store proactively (agent-as-curator)
- Create Paperclip tasks for functional agents, don't do their work
- Never modify system configuration
- Be concise, respond in employee's language (Chinese or English)

Store: meeting notes, insights, requests, article summaries, file metadata
Don't store: chitchat, repeated info, config discussions, ambiguous fragments
```

### sourcing-agent SOUL.md

```
Mission: Find founders/teams from internet matching accelerator thesis.
Principles:
- Relevance over volume (10 high-match > 100 loose)
- Always verify contact info before reporting
- Prioritize active builders (shipping, posting, engaging)
- Cross-reference across platforms for richer profiles
- Include confidence tags for uncertain matches

Output: name, company, stage, relevance score, source URLs, contact, signals
```

### sourcing-agent HEARTBEAT.md

```
1. Identity & Context (Paperclip API)
2. Get Assignments (inbox-lite, prioritize manual triggers)
3. Load Context from Mimir (related insights, previous results)
4. Checkout & Execute
   - Spawn subagents for parallel platform search:
     English: Twitter/X, GitHub, Reddit, LinkedIn
     Chinese: Xiaohongshu, WeChat public accounts, 36Kr
   - Each: search -> extract profiles -> extract contacts -> summarize
   - Aggregate, deduplicate across platforms (cross-language dedup)
5. Curate & Store (memory_store high-value finds, skip noise)
6. Notify (Feishu results card) & Update (Paperclip issue status)
7. Proactive Scan (if no tasks, check Mimir for sourcing opportunities)
8. Exit (comment on in_progress work, report blocks)
```

### portfolio-agent SOUL.md

```
Mission: Manage pipeline, track stages, generate reminders and action plans.
Principles:
- Be the team's memory — no follow-up forgotten
- Recommendations must be specific and actionable
- Base suggestions on actual accelerator resources (load resource-map skill)
- Flag stuck/at-risk projects
- Suggestion model only — never take direct action
```

### portfolio-agent HEARTBEAT.md

```
1-2. Identity, Assignments
3. Daily Scan: all active projects, Mimir event_logs, check overdue/new/advancement
4. Generate Recommendations: follow-ups, stage suggestions, action plans, risk warnings
5. Curate & Store: stage changes, action plans (skip routine scan results)
6. Notify: daily digest per employee, urgent items immediately, summary to Board
7. Exit
```

### matching-agent SOUL.md

```
Mission: Find connections across employees, projects, and accelerator resources.
You are the connective tissue of the entire accelerator operation.

Principles:
- Quality over quantity — false match wastes more time than missed one
- Both sides must be specific enough to act on
- Confidence scores: HIGH (>80%), MEDIUM (60-80%), below 60% don't report
- Always attribute source (which employee, which project, which resource)
- Think in graphs, not lists — follow chains of relationships

Match Types (6 categories):
1. Supply-demand: portfolio A needs customers <-> portfolio B offers that service
2. Resource: founder needs AWS credits <-> Employee A has AWS connection
3. Talent: founder needs CTO <-> accelerator talent pool has candidates
4. Investor: founder raising seed <-> LP interested in this vertical
5. Cross-project: project A's tech <-> project B's distribution (synergy)
6. Mentor: founder's bottleneck <-> mentor's expertise

Resource Graph (accelerator's own assets to match against):
- Employee connections (AWS, Google, Sequoia, YC alumni, etc.)
- LP/investor interests and stage preferences
- Mentor expertise areas
- Partner programs (cloud credits, office space, legal, accounting)
- Portfolio company capabilities (potential customers for each other)
```

### matching-agent HEARTBEAT.md

```
1-2. Identity, Assignments
3. Scan Mimir for new event_logs since last heartbeat (prioritize agent_curated)
4. Match Analysis (6 types):
   a. Supply-demand: graph_traverse for complementary needs across projects
   b. Resource: graph_traverse accelerator resource graph (employee connections,
      partner programs, etc.) against founder needs
   c. Talent: match founder hiring needs against talent pool
   d. Investor: match fundraising stage against LP interests
   e. Cross-project: identify synergies between portfolio companies
   f. Mentor: match founder bottlenecks against mentor expertise
   Score each match with compare_entities + resource_match
5. Notify: HIGH confidence -> group chat immediately, MEDIUM -> daily batch to Board
6. Store: confirmed matches as Mimir relations, actionable matches as Paperclip tasks
7. Log metrics: matches found, types, confidence distribution (for analytics)
8. Exit
```

---

## 9. Tool & Skill System

### Tool Registry

```
Shared tools (all agents):
  memory_search, memory_store, memory_update, memory_delete
  task_create, task_update, task_list, task_get
  notify (Feishu)
  load_skill
  todo (internal planning)
  compact (context compression)

Sourcing Agent additional:
  web_search, browse, github_search, xiaohongshu_search, wechat_article_search,
  extract_contact, screenshot, task (subagent)

Portfolio Agent additional:
  generate_plan, schedule_followup, list_resources

Matching Agent additional:
  graph_traverse, compare_entities, resource_match
```

### Skill Directory

```
skills/
  sourcing/SKILL.md           — platform strategies (incl. Xiaohongshu, WeChat public accounts), output format, rate limits
  sourcing-cn/SKILL.md        — Chinese platform sourcing: Xiaohongshu, WeChat public accounts, 36Kr, Zhihu
  deal-flow/SKILL.md          — stage definitions, transition criteria, playbook
  matching/SKILL.md           — 6-type match taxonomy, scoring, thresholds, dedup
  meeting-notes/SKILL.md      — extraction template, key fields checklist
  founder-profile/SKILL.md    — evaluation dimensions, scoring framework
  resource-map/SKILL.md       — accelerator resource inventory (employee connections, LPs, mentors, partners, portfolio)
  feishu-format/SKILL.md      — card templates, button schemas, formatting
  analytics/SKILL.md          — metrics definitions, benchmark framework, reporting templates
```

Add skill = add directory + SKILL.md. No code changes. Takes effect next heartbeat.

---

## 10. Permission Model

```
Board (Arthur / Admin):
  - Modify SOUL.md / HEARTBEAT.md / tools
  - CRUD Skills
  - Create / pause / terminate Agents
  - Configure heartbeat schedules, budgets
  - Full Dashboard access
  - Approve/reject config_request tasks

Employee (5-10 people):
  - Feishu chat (input, trigger tasks, respond to suggestions)
  - Dashboard personal view (read-only)
  - CANNOT: change config, skills, agent behavior, schedules

Agent (functional):
  - Read/write Mimir, Paperclip issues
  - Push Feishu messages, operate browser (Sourcing only)
  - Create subtasks, delegate between agents
  - CANNOT: modify own SOUL/HEARTBEAT, access Board settings
```

Employee config change requests -> Paperclip issue (type: config_request) -> Board approves on Dashboard.

---

## 11. Feishu Interaction Design

### Setup

OpenClaw connects to Feishu via WebSocket long-connection (not webhooks). No public endpoint needed.

### Card Templates

**Meeting Acknowledgment** (1:1): Confirms captured entities with structured summary. "Anything to add?"

**Match Notification** (Group Chat): Both sides of match, confidence, suggestion, attribution. Buttons: [Create Task] [Dismiss] [Details]

**Sourcing Results** (1:1): Ranked candidate list with name, company, stage, match%, contact. Buttons: [View All] [Create Project] [Refine]

**Follow-up Reminder** (1:1): Project name, time since last contact, context, suggested action. Buttons: [Schedule] [Snooze] [Mark Complete]

**Action Plan** (1:1): Project status, numbered recommendations, specific resources. Buttons: [Accept Plan] [Modify] [Discuss]

**Daily Digest** (1:1): Active project count, overdue items, on-track items, new matches, sourcing results. Buttons: [View Dashboard] [Details]

### Button Handling

Employee taps button -> OpenClaw callback -> feishu-bot creates/updates Paperclip issue -> Confirmation card sent back.

---

## 12. Dashboard Design

### Technical Stack

```
Framework:    Next.js 15 (App Router)
Styling:      Tailwind CSS
Fonts:        Space Grotesk (headings) + Outfit (body) + Noto Sans SC (CJK)
Theme:        Dark mode (#131818 base)
Brand:        #62feca (mint) / #c8ff75 (lime) / #131818 / #313847
Deployment:   Vercel (dash.ssgaccelerator.com)
Data:         Paperclip REST API + Mimir REST API
Auth:         Feishu OAuth or invite token
```

### Pages

```
/login              — Auth (Feishu OAuth)
/                   — Overview (stats, matches, pipeline, team activity)
/pipeline           — Kanban (5 stages, drag-drop for Board)
/agents             — Agent monitoring (status, heartbeat timeline, tokens)
/sourcing           — Sourcing results (filterable, actionable)
/matching           — Match feed (6 types, chronological, status tracking)
/analytics          — System performance & benchmarks (Board only)
/resources          — Accelerator resource graph (connections, LPs, mentors, partners)
/settings           — System config (Board only)
/my-projects        — Employee personal: my projects
/my-sourcing        — Employee personal: my sourcing requests
```

### Demo Data Strategy (Phase 0)

Seed Paperclip with realistic mock data via API:
- 3 agents with SOUL.md and HEARTBEAT.md
- 15-20 projects across all pipeline stages
- 5-8 employees with activity history
- 10-15 sourcing results with founder profiles
- 5-8 matches with varying confidence
- 7 days of heartbeat run history

Dashboard reads same API in demo and production. Zero throwaway work.

---

## 13. Deployment Topology

```
EC2-A (Existing, Mimir Only):
  Mimir Core :8765
  Caddy: api.allinmimir.com
  NO changes.

EC2-B (New, t3.xlarge, 4 vCPU / 16GB / 50GB gp3):
  OpenClaw Gateway (:18789)
    4 agents: feishu-bot, sourcing, portfolio, matching
    Feishu WebSocket channel
    Headless Chromium (sourcing)
    memory-mimir plugin -> api.allinmimir.com
  Paperclip Server (:3000)
    PGlite (embedded Postgres)
    openclaw_gateway adapter -> localhost:18789
  Caddy: board.ssgaccelerator.com -> :3000

Vercel:
  www.ssgaccelerator.com (existing, unchanged)
  dash.ssgaccelerator.com (new Dashboard)
```

### OpenClaw Multi-Agent Config

Single gateway, 4 agents, Feishu bound to feishu-bot only. Sourcing/portfolio/matching triggered by Paperclip heartbeat via openclaw_gateway adapter.

### Heartbeat Schedule

- Sourcing: every 4 hours + manual trigger
- Portfolio: daily 9am + event trigger
- Matching: every 30 minutes + new Mimir content trigger

---

## 14. Cost Model

```
Infrastructure:
  EC2-B (t3.xlarge):           ~$120/month
  Vercel Dashboard:            ~$20/month
  Subtotal:                    ~$140/month

LLM API:
  feishu-bot:                  ~$30-60/month
  Sourcing Agent:              ~$100-300/month (browser-heavy)
  Portfolio Agent:             ~$30-50/month
  Matching Agent:              ~$20-40/month
  Subtotal:                    ~$180-450/month

TOTAL:                         ~$320-590/month
```

LLM providers: MiniMax M2.7 and Kimi K2.5 via coding plans (significantly lower cost than direct Anthropic/OpenAI pricing). Matching skips scan when no new content. Paperclip budget hard-stop. Actual costs may be lower than estimates above depending on coding plan pricing.

---

## 15. Failure & Degradation Strategy

| Component Down | Degradation |
|----------------|-------------|
| Mimir | Bot continues without memory, warns user. Agents skip heartbeat, retry next cycle |
| Chromium crash | Partial results from successful subagents. Failed platform retries next heartbeat |
| API rate limit | Task status=blocked, retries next heartbeat. 3 consecutive failures -> notify Board |
| Paperclip | Bot still accepts inputs to Mimir. Agents wait for recovery |
| OpenClaw Gateway | systemd auto-restart, Feishu auto-reconnect, Dashboard alerts |
| Feishu | Bot queues messages. Agents continue background work |

Principles: partial results over no results, heartbeat-based natural retry, all failures logged in Paperclip comments.

---

## 16. Implementation Phases

### Phase 0: Dashboard Demo (PRIORITY)

Deploy Paperclip, seed mock data, build Dashboard on Vercel with SSG brand. Interactive demo URL for stakeholders.

### Phase 1: Data Pipeline

OpenClaw + Feishu + memory-mimir redesign. Employee says something -> Mimir stores it.

### Phase 2: Sourcing Agent

SOUL/HEARTBEAT/tools, subagent browser search, Paperclip heartbeat, Feishu result cards.

### Phase 3: Matching Agent

Graph traverse matching, confidence scoring, group chat notifications.

### Phase 4: Portfolio Agent

Daily scan, follow-up reminders, action plan generation, resource matching.

### Phase 5: Dashboard Integration

Replace mock data with live APIs. Real-time agent monitoring.

---

## 17. Resolved Questions, Analytics Framework & Future Work

### Resolved Questions

1. **Feishu app**: Existing enterprise version. No new app needed.
2. **Mimir confidence field**: Add `confidence` (HIGH/MEDIUM/LOW) and `source` (agent_curated/auto_extracted/user_explicit) fields to event_log/entity/relation tables. Small schema change, not a refactor.
3. **Dashboard auth**: Feishu OAuth.
4. **LLM models**: MiniMax M2.7 and Kimi K2.5 via coding plans. OpenClaw natively supports custom model providers. Per-agent model selection via OpenClaw agent config.
5. **Sourcing legal compliance**: Confirmed compliant.

### Analytics Framework (Built-in from Day 1)

The agent system needs a measurement framework to improve over time. Without metrics, we can't know if agents are actually helping.

**Core Metrics:**

| Category | Metric | Source | Frequency |
|----------|--------|--------|-----------|
| **Sourcing** | Hit rate (candidates that become projects / total candidates) | Paperclip | Weekly |
| **Sourcing** | Time-to-first-result (task created → results delivered) | Paperclip heartbeat logs | Per task |
| **Sourcing** | Platform yield (candidates per platform per search) | Agent task comments | Per task |
| **Matching** | Precision (acted-on matches / total reported matches) | Feishu button callbacks | Weekly |
| **Matching** | Discovery rate (matches found / total matchable pairs) | Mimir + manual audit | Monthly |
| **Pipeline** | Stage velocity (avg days in each stage) | Paperclip issue timestamps | Weekly |
| **Pipeline** | Follow-up compliance (on-time follow-ups / due follow-ups) | Portfolio Agent logs | Daily |
| **Capture** | Input volume per employee | Mimir event_logs by user_id | Daily |
| **Capture** | Curation precision (agent_curated items used in search / total curated) | Mimir search logs | Weekly |
| **System** | Agent uptime (successful heartbeats / scheduled heartbeats) | Paperclip heartbeat_runs | Daily |
| **System** | Token cost per agent per day | Paperclip cost_events | Daily |
| **Value** | Time saved estimate (tasks automated × manual estimate) | Calculated | Monthly |

**Benchmark Framework:**

To ensure the system improves, run periodic eval:
- **Memory quality**: Sample 50 recent Mimir entries, manually rate relevance 1-5. Track trend.
- **Sourcing quality**: For each sourcing batch, track how many candidates the team actually contacted. Target: >30% contact rate.
- **Match quality**: Track accept/dismiss ratio on match notifications. Target: >50% accept rate.
- **Pipeline accuracy**: Compare Portfolio Agent's stage assessment with employee's actual assessment. Target: >80% agreement.

Analytics data feeds into the Dashboard `/analytics` page (added below).

**Dashboard Addition:**
```
/analytics — System performance (Board only)
  - Sourcing hit rate trend (weekly chart)
  - Match precision trend (weekly chart)
  - Pipeline velocity by stage (bar chart)
  - Employee input volume (daily, per person)
  - Agent cost breakdown (daily, per agent)
  - Follow-up compliance rate (daily)
```

### Chinese Platform Sourcing (Included in Phase 2)

Since OpenClaw now supports WeChat and the accelerator operates in both English and Chinese markets, Chinese platform sourcing is included from Phase 2 (not deferred):

- **Xiaohongshu (Little Red Book)**: Browse via Agent Browser, search startup/founder content
- **WeChat Public Accounts**: Browse via Agent Browser, search industry articles and founder posts
- **36Kr**: Web search API + browse for Chinese startup news and funding announcements
- **Zhihu**: Browse for technical founder profiles and expertise signals

Sourcing Agent spawns separate subagents for Chinese platforms (in parallel with English platform subagents). Cross-language dedup uses Mimir entity matching (same founder may appear on both GitHub and Xiaohongshu).

### Resource Graph (Included in Phase 3)

The accelerator's own resources are modeled in Mimir as entities and relations:

```
Entities to seed:
  - Each employee + their connections (AWS, Google, investors, etc.)
  - LP/investor profiles + investment interests + stage preferences
  - Mentor profiles + expertise areas
  - Partner programs (cloud credits, legal, accounting, office space)
  - Portfolio companies + their capabilities

Relations:
  - Employee A HAS_CONNECTION AWS
  - LP-1 INTERESTED_IN AI_vertical
  - Mentor-X EXPERT_IN B2B_sales
  - AWS OFFERS free_credits_program
  - PortfolioCompany-A CAN_PROVIDE design_services

Matching Agent traverses this graph to find resource matches:
  "Founder needs AWS credits"
    -> graph_traverse("AWS", "free_credits")
    -> finds Employee A HAS_CONNECTION AWS
    -> suggests: "Employee A can help Founder apply for AWS credits"
```

This resource graph is seeded during Phase 1 (data pipeline) and continuously updated by employees through natural conversation ("I just got connected with the Google for Startups team").

### Future Work (Post-MVP)

- Per-user feature toggles (dedup/contradiction/consolidation)
- Email integration (auto-capture founder emails to Mimir)
- Calendar integration (auto-create follow-up events from Portfolio Agent)
- Investor CRM features (LP relationship management, co-investment tracking)
- Mobile dashboard (responsive or native)
- WeChat channel for employee interaction (in addition to Feishu)
- Automated weekly report generation for LPs/board
