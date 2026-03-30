# Phase 2: Sourcing Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given an insight or sourcing request, find relevant founders/teams from 7+ platforms (Twitter/X, GitHub, Reddit, LinkedIn, Xiaohongshu, WeChat public accounts, 36Kr) within hours.

**Architecture:** Sourcing Agent runs inside OpenClaw on EC2-B. Triggered by Paperclip heartbeat (every 4h) or manual task creation (employee request via feishu-bot). Uses subagent pattern — spawns parallel browser subagents per platform, aggregates results, stores in Mimir, and sends Feishu result cards.

**Depends on:** Phase 1 (EC2-B, OpenClaw, Feishu channel, memory-mimir with tools)

---

## Project References

- **Design Spec**: `/Users/arthur/Desktop/SSGLAB/ssg-accelerator-agent-system-design.md` (sections 5, 7-s04, 8, 9)
- **Agent Dir**: `/home/ec2-user/openclaw-agents/sourcing-agent/`
- **LLM Model**: Kimi K2.5 (browser-heavy tasks, good at Chinese content)
- **Browser**: Headless Chromium inside OpenClaw Docker container

---

## Task 1: Write sourcing-agent SOUL.md + HEARTBEAT.md

**Goal:** Define agent identity, search strategy, output format, platform priorities.

- [ ] **Step 1: Create SOUL.md**

Write to `/home/ec2-user/openclaw-agents/sourcing-agent/SOUL.md`:

```markdown
# sourcing-agent — Founder & Team Discovery

## Mission
Find founders and teams from the internet that match SSG Accelerator's
investment thesis and employee insights.

## Principles

1. **Relevance over volume.** 10 high-match candidates > 100 loose matches.
   Every result must have a clear reason for inclusion.

2. **Verify before reporting.** Cross-reference across platforms for richer
   profiles. Include confidence tags for uncertain matches.

3. **Prioritize active builders.** Look for signals: shipping product,
   posting content, engaging community, open-source contributions,
   recent funding activity.

4. **Cross-language search.** SSG operates in both English and Chinese markets.
   Search English platforms (Twitter, GitHub, Reddit, LinkedIn) AND
   Chinese platforms (Xiaohongshu, WeChat public accounts, 36Kr, Zhihu).

5. **Structured output.** Every candidate must include:
   - Founder name + company name
   - Domain / vertical
   - Stage (pre-seed, seed, series A, etc.)
   - Relevance score (0-100) with explanation
   - Source URLs (all platforms where found)
   - Contact info (email, Twitter, LinkedIn — if available)
   - Key signals (GitHub stars, MAU, team size, funding)

## Platform Priority

| Priority | Platform | Strength |
|----------|----------|----------|
| 1 | GitHub | Technical founders, OSS projects, star counts |
| 2 | Twitter/X | Thought leaders, announcements, engagement |
| 3 | LinkedIn | Professional profiles, team composition |
| 4 | Xiaohongshu | Chinese consumer tech, lifestyle brands |
| 5 | Reddit | Community validation, user sentiment |
| 6 | WeChat Public Accounts | Chinese industry analysis, founder posts |
| 7 | 36Kr | Chinese startup news, funding announcements |

## Scoring Framework

- 90-100: Strong match — domain fit, active team, clear traction
- 80-89: Good match — domain fit, some traction signals
- 70-79: Potential match — related domain, early signals
- 60-69: Weak match — tangentially related, worth noting
- Below 60: Skip — do not include in results
```

- [ ] **Step 2: Create HEARTBEAT.md**

Write to `/home/ec2-user/openclaw-agents/sourcing-agent/HEARTBEAT.md`:

```markdown
# Sourcing Agent Heartbeat

## Execution Plan

### 1. Identity & Context
- Load SOUL.md
- Get current date/time for search freshness

### 2. Get Assignments
- Check Paperclip inbox for sourcing tasks (prioritize manual triggers)
- If no tasks, check Mimir for recent insights that suggest sourcing opportunities

### 3. Load Context from Mimir
- memory_search for related previous sourcing results (avoid duplicates)
- memory_search for employee insights related to the sourcing thesis

### 4. Execute Search
- Create TodoWrite plan with platforms to search
- Spawn subagents in parallel:

  **English platforms:**
  - Subagent 1: Twitter/X — search keywords, find founders posting about the domain
  - Subagent 2: GitHub — search repos, trending projects, contributor profiles
  - Subagent 3: Reddit — search relevant subreddits for product launches, discussions
  - Subagent 4: LinkedIn — search company pages, founder profiles

  **Chinese platforms:**
  - Subagent 5: Xiaohongshu — browse for startup content, founder profiles
  - Subagent 6: WeChat Public Accounts — search industry articles, founder posts
  - Subagent 7: 36Kr — search funding announcements, startup profiles

- Each subagent: search → extract profiles → extract contacts → summarize
- Each subagent returns structured summary only (no raw DOM/screenshots in parent)

### 5. Aggregate & Deduplicate
- Merge results across platforms
- Cross-language dedup (same founder on GitHub and Xiaohongshu)
- Score each candidate (relevance to thesis, traction signals, team quality)
- Rank by score, filter out below 60

### 6. Curate & Store
- memory_store HIGH-value finds (score >= 80) with full profile
- memory_store MEDIUM finds (60-79) with summary only
- Skip noise — don't store rejected candidates

### 7. Notify & Update
- Send Feishu results card to requesting employee
- Update Paperclip issue status to completed
- Comment on issue with result summary

### 8. Proactive Scan
- If no assigned tasks, scan Mimir for recent insights that suggest sourcing
- Check for investment themes mentioned multiple times by different employees

### 9. Exit
- Comment on any in_progress work
- Report any blocks (rate limits, failed platforms)
- Shutdown until next heartbeat
```

- [ ] **Step 3: Verify SOUL.md and HEARTBEAT.md load on heartbeat**

Trigger a manual heartbeat via Paperclip and check OpenClaw logs:
```bash
docker logs openclaw-gateway | grep "sourcing-agent"
```

---

## Task 2: Implement Tool Handlers

**Goal:** Register all sourcing-specific tools in the agent's tool dispatch map.

- [ ] **Step 1: Configure web_search tool**

```json
// In sourcing-agent settings.json, tool registry:
{
  "name": "web_search",
  "description": "Search the web for startup founders, companies, and technology trends. Returns search result snippets.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" },
      "num_results": { "type": "integer", "description": "Number of results (default 10, max 20)" }
    },
    "required": ["query"]
  }
}
```

Implementation: OpenClaw built-in web search (Google/Bing API).

- [ ] **Step 2: Configure browse tool**

```json
{
  "name": "browse",
  "description": "Navigate to a URL and extract page content. Use for platform-specific searches (Xiaohongshu, WeChat, 36Kr, LinkedIn profiles).",
  "input_schema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "URL to browse" },
      "extract": { "type": "string", "description": "What to extract: 'text', 'links', 'profiles', 'structured'" }
    },
    "required": ["url"]
  }
}
```

Implementation: OpenClaw headless Chromium browser.

- [ ] **Step 3: Configure github_search tool**

```json
{
  "name": "github_search",
  "description": "Search GitHub for repositories, users, and organizations related to a technology or domain.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "GitHub search query" },
      "type": { "type": "string", "enum": ["repositories", "users", "organizations"], "description": "Search type" },
      "sort": { "type": "string", "enum": ["stars", "forks", "updated"], "description": "Sort by" }
    },
    "required": ["query"]
  }
}
```

Implementation: GitHub Search API (unauthenticated or with token for higher rate limits).

- [ ] **Step 4: Configure xiaohongshu_search tool**

```json
{
  "name": "xiaohongshu_search",
  "description": "Search Xiaohongshu (Little Red Book) for startup/founder content. Browse-based — navigates and extracts.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query (Chinese or English)" },
      "content_type": { "type": "string", "enum": ["notes", "users"], "description": "Search for notes or user profiles" }
    },
    "required": ["query"]
  }
}
```

Implementation: Uses browse tool internally — navigates to Xiaohongshu search page, extracts results.

- [ ] **Step 5: Configure wechat_article_search tool**

```json
{
  "name": "wechat_article_search",
  "description": "Search WeChat public account articles for industry analysis, founder interviews, and funding news.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query (Chinese)" },
      "recent_days": { "type": "integer", "description": "Limit to articles from last N days (default 30)" }
    },
    "required": ["query"]
  }
}
```

Implementation: Uses Sogou WeChat search (https://weixin.sogou.com/) via browse tool.

- [ ] **Step 6: Configure extract_contact tool**

```json
{
  "name": "extract_contact",
  "description": "Extract contact information from a founder/company profile page.",
  "input_schema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "Profile URL to extract contact from" },
      "name": { "type": "string", "description": "Person or company name for context" }
    },
    "required": ["url"]
  }
}
```

Implementation: Browse + LLM extraction of email, Twitter, LinkedIn, website from page content.

- [ ] **Step 7: Configure screenshot tool**

```json
{
  "name": "screenshot",
  "description": "Take a screenshot of a web page for evidence/records.",
  "input_schema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "URL to screenshot" },
      "filename": { "type": "string", "description": "Output filename" }
    },
    "required": ["url"]
  }
}
```

Implementation: OpenClaw headless Chromium screenshot, saved to workspace directory.

---

## Task 3: Implement Subagent Parallel Search

**Goal:** Each platform search runs as an independent subagent with clean messages[], returning summary only.

- [ ] **Step 1: Define subagent spawning in HEARTBEAT.md**

The sourcing agent uses OpenClaw's `task` tool to spawn subagents:

```
# Each subagent call:
task({
  prompt: "Search Twitter/X for founders building LLM serving tools. Find 3-5 candidates with: name, company, domain, stage, GitHub/Twitter URLs, key signals. Return structured JSON.",
  tools: ["web_search", "browse", "extract_contact"],
  model: "kimi-k2.5"
})
```

Key design: each subagent gets a fresh `messages[]`. All browser DOM, screenshots, and intermediate search noise stays inside the subagent. Only the structured summary returns to the parent.

- [ ] **Step 2: Implement English platform subagents**

Subagent prompts for each English platform:

**Twitter/X subagent:**
```
Search Twitter/X for [thesis]. Look for founders who:
- Post about building products in this space
- Share technical insights or product updates
- Have engagement (likes, retweets, followers)
Extract: name, company, bio, follower count, recent relevant tweets, website/email if available.
```

**GitHub subagent:**
```
Search GitHub for repositories related to [thesis]. Look for:
- Projects with 100+ stars
- Active development (commits in last 3 months)
- README with clear product description
For top projects, extract: maintainer name, company (if any), star count, language, description.
```

**Reddit subagent:**
```
Search Reddit (r/startups, r/SaaS, r/MachineLearning, relevant subreddits) for [thesis].
Look for: product launches, founder AMAs, Show HN-style posts.
Extract: founder/company name, product description, traction signals, community reception.
```

**LinkedIn subagent:**
```
Search LinkedIn for companies and founders in [thesis].
Look for: company pages with recent activity, founder profiles with relevant experience.
Extract: name, company, title, team size, location, funding status.
```

- [ ] **Step 3: Implement Chinese platform subagents**

**Xiaohongshu subagent:**
```
Search Xiaohongshu for [thesis in Chinese]. Look for:
- Founder posts about their product/company
- Startup/tech content creators with relevant expertise
Extract: name, company, content summary, follower count, contact if available.
```

**WeChat Public Account subagent:**
```
Search WeChat articles (via Sogou) for [thesis in Chinese]. Look for:
- Founder interviews or profiles
- Industry analysis mentioning startups in this space
- Funding announcements
Extract: founder/company name, article summary, publication date, source account.
```

**36Kr subagent:**
```
Search 36Kr for [thesis in Chinese]. Look for:
- Funding announcements in this vertical
- Company profiles and reviews
- Industry trend reports
Extract: company name, founder, funding stage, amount, key details.
```

- [ ] **Step 4: Implement result aggregation**

After all subagents return:
1. Parse each subagent's structured results
2. Deduplicate across platforms (match by founder name + company name, fuzzy match for cross-language)
3. Merge cross-platform profiles (same founder on GitHub and Twitter = one enriched profile)
4. Score each candidate using SOUL.md scoring framework
5. Sort by score descending, filter out < 60

- [ ] **Step 5: Test subagent parallel execution**

Create a test sourcing task and verify:
- All 7 subagents spawn
- Each returns structured results
- Parent context stays clean (no browser DOM pollution)
- Results are properly aggregated

---

## Task 4: Implement TodoWrite for Multi-Step Task Tracking

**Goal:** Sourcing agent uses internal checklist to track progress through multi-platform search.

- [ ] **Step 1: Define TodoWrite usage in HEARTBEAT.md**

At the start of each heartbeat, create a TodoWrite checklist:
```
- [ ] Load context from Mimir
- [ ] Search Twitter/X (subagent)
- [ ] Search GitHub (subagent)
- [ ] Search Reddit (subagent)
- [ ] Search LinkedIn (subagent)
- [ ] Search Xiaohongshu (subagent)
- [ ] Search WeChat (subagent)
- [ ] Search 36Kr (subagent)
- [ ] Aggregate and deduplicate results
- [ ] Store in Mimir
- [ ] Send Feishu results card
- [ ] Update Paperclip task status
```

- [ ] **Step 2: Update each step to check off on completion**

After each subagent returns or step completes, update the todo item to `[x]`.
If 3+ rounds pass without todo update, the agent self-nags to stay on track.

---

## Task 5: Implement Context Compaction

**Goal:** Keep agent context clean during long sourcing sessions.

- [ ] **Step 1: Implement micro-compaction for browse results**

After each browse tool call, replace the full page content with a compressed summary:
```
[browse result: twitter.com/search?q=LLM+serving — extracted 5 profiles, 3 relevant]
```

This prevents browser DOM from filling the context window.

- [ ] **Step 2: Implement auto-compaction at token threshold**

When agent context reaches 80% of model's context window:
1. Summarize all completed subagent results
2. Discard intermediate search steps
3. Keep: thesis, aggregated results so far, remaining todo items
4. Save full transcript to disk

- [ ] **Step 3: Implement manual compaction trigger**

If the agent detects it's running low on context mid-search, it can call `compact` tool to force summarization.

---

## Task 6: Wire Paperclip Heartbeat

**Goal:** Sourcing agent runs every 4 hours automatically + manual trigger via task_create.

- [ ] **Step 1: Verify heartbeat schedule**

The heartbeat was configured in Phase 1 Task 2. Verify it fires:
```bash
# Check Paperclip heartbeat_runs
curl "http://localhost:3000/api/companies/$COMPANY_ID/agents/sourcing-agent/heartbeat_runs" \
  -H "Authorization: Bearer $API_KEY"
```

- [ ] **Step 2: Test manual trigger**

When feishu-bot creates a sourcing task in Paperclip, it should trigger the sourcing agent's next heartbeat immediately (not wait 4 hours):

```bash
# Create a manual trigger task
curl -X POST "http://localhost:3000/api/companies/$COMPANY_ID/issues" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sourcing",
    "title": "Find AI infra teams - LLM serving",
    "description": "Employee Carol requested search for AI infrastructure teams focused on LLM serving and inference optimization.",
    "assignee": "sourcing-agent",
    "priority": "high",
    "triggerHeartbeat": true
  }'
```

- [ ] **Step 3: Verify heartbeat → subagent execution → results**

After heartbeat fires:
1. OpenClaw loads HEARTBEAT.md
2. Agent executes search plan
3. Subagents spawn and complete
4. Results stored in Mimir
5. Feishu notification sent
6. Paperclip task updated

Check logs:
```bash
docker logs openclaw-gateway | grep "sourcing-agent"
```

---

## Task 7: Implement Feishu Result Cards

**Goal:** Send formatted sourcing results to the requesting employee in Feishu.

- [ ] **Step 1: Create feishu-format skill**

Write to `/home/ec2-user/openclaw-agents/sourcing-agent/skills/feishu-format/SKILL.md`:

```markdown
# Feishu Format Skill

## Sourcing Results Card Template

When sending sourcing results to Feishu, use this format:

### Header
Sourcing Complete: [thesis/domain]
Found [N] candidates:

### Candidate List (top 5, ranked by score)
1. **[Company Name]** — [domain], [stage], [key signal] — [score]% match
   [1-line reason for match]
2. ...

### Footer
Requested by [employee name] | [N] platforms searched | [timestamp]

### Buttons
[View All] — links to Dashboard sourcing page
[Create Project for #1] — creates Paperclip project issue
[Refine Search] — creates new sourcing task with narrower criteria
```

- [ ] **Step 2: Implement Feishu card sending via notify tool**

The sourcing agent calls the `notify` tool with:
```json
{
  "channel": "feishu",
  "target": "<requesting-employee-id>",
  "type": "sourcing_results",
  "data": {
    "thesis": "AI Infrastructure",
    "candidates": [...],
    "platforms_searched": 7,
    "requested_by": "Carol"
  }
}
```

The notify handler formats using the feishu-format skill template and sends via Feishu API.

- [ ] **Step 3: Implement button callbacks**

When employee taps a button on the Feishu card:
- **[View All]**: Opens `dash.ssgaccelerator.com/sourcing` in browser
- **[Create Project]**: feishu-bot creates a Paperclip project issue for the selected candidate
- **[Refine Search]**: feishu-bot prompts the employee for narrower criteria, creates new sourcing task

- [ ] **Step 4: Test Feishu card rendering**

Verify the card appears correctly in Feishu with all elements:
- Header with result count
- Ranked candidate list with scores
- Buttons that respond to taps

---

## Task 8: Implement Workspace Isolation

**Goal:** Each sourcing task gets an isolated directory for results, screenshots, contacts.

- [ ] **Step 1: Create workspace per task**

When a sourcing heartbeat starts:
```bash
# Workspace structure:
/home/ec2-user/openclaw-agents/sourcing-agent/workspaces/
  task-<task-id>/
    results.json         # Aggregated candidate results
    screenshots/         # Evidence screenshots
    contacts.json        # Extracted contact information
    raw/                 # Raw subagent outputs (for debugging)
      twitter.json
      github.json
      reddit.json
      linkedin.json
      xiaohongshu.json
      wechat.json
      36kr.json
```

- [ ] **Step 2: Configure subagents to write to workspace**

Each subagent receives the workspace path and writes its results there:
```
task({
  prompt: "...",
  tools: ["web_search", "browse", "extract_contact", "screenshot"],
  workspace: "/workspaces/task-<task-id>/raw/twitter.json"
})
```

- [ ] **Step 3: Implement workspace cleanup**

After results are stored in Mimir and Feishu card is sent:
- Keep `results.json` and `contacts.json` (for Dashboard reference)
- Delete `raw/` and `screenshots/` after 7 days
- Log workspace size for cost monitoring

---

## Task 9: End-to-End Test

**Goal:** Full sourcing pipeline from employee request to Feishu results.

- [ ] **Step 1: Employee creates sourcing request**

In Feishu, employee Carol sends:
```
We should look at AI infrastructure teams — especially those building
LLM serving or inference optimization.
```

- [ ] **Step 2: feishu-bot creates Paperclip task**

Verify:
- Bot responds: "Created sourcing task for AI infrastructure teams. You'll get results within the next heartbeat cycle."
- Paperclip has new issue (type: sourcing, assignee: sourcing-agent)

- [ ] **Step 3: Sourcing agent heartbeat fires**

Verify via logs:
- HEARTBEAT.md loaded
- TodoWrite plan created
- 7 subagents spawned

- [ ] **Step 4: Subagents execute**

Verify per subagent:
- Search queries executed
- Profiles extracted
- Results written to workspace

- [ ] **Step 5: Results aggregated and stored**

Verify:
- Candidates deduplicated across platforms
- Scored and ranked
- Top results stored in Mimir with confidence=HIGH

- [ ] **Step 6: Feishu result card received**

Verify Carol receives:
- Formatted card with ranked candidates
- Working buttons ([View All], [Create Project], [Refine Search])

- [ ] **Step 7: Paperclip task updated**

Verify:
- Task status changed to completed
- Summary comment added with result count

- [ ] **Step 8: Measure performance**

- Time from task creation to Feishu results: target < 4 hours
- Number of candidates found per platform
- Dedup rate (cross-platform overlaps)
- Candidate quality (manual spot check of top 5)

---

## Phase 2 Completion Checklist

After all 9 tasks:

- [ ] sourcing-agent SOUL.md defines search strategy and scoring framework
- [ ] sourcing-agent HEARTBEAT.md defines full execution plan
- [ ] 7 tool handlers registered (web_search, browse, github_search, xiaohongshu_search, wechat_article_search, extract_contact, screenshot)
- [ ] Subagent parallel search works for all 7 platforms
- [ ] Cross-language dedup merges same founder across English and Chinese platforms
- [ ] Scoring framework ranks candidates 0-100, filters below 60
- [ ] TodoWrite tracks progress through multi-platform search
- [ ] Context compaction keeps agent context clean during long sessions
- [ ] Paperclip heartbeat fires every 4h + manual trigger
- [ ] Feishu result cards show ranked candidates with working buttons
- [ ] feishu-format skill defines card template
- [ ] Workspace isolation prevents parallel task interference
- [ ] End-to-end: employee request → Feishu results in < 4 hours
- [ ] Results stored in Mimir for future matching

---

## Next Phase

Phase 3 (Matching Agent) uses the Mimir data populated by sourcing to find cross-employee and cross-project connections.
