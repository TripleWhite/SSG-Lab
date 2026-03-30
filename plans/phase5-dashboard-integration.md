# Phase 5: Dashboard Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard shows live data from Paperclip + Mimir APIs instead of demo data. Real-time agent monitoring, live pipeline, actual sourcing results, and verified match notifications — all in the SSG-branded dashboard at `dash.ssgaccelerator.com`.

> **2026-03-30 shipped note:** This is no longer a blank-slate plan. The repo now has a signed dashboard shell, live Paperclip wiring for Overview, Pipeline, Agents, and Analytics, Mimir-backed Resources with seed fallback, role-gated `/analytics` and `/settings`, and truthful empty states for `/sourcing` and `/matching`. The checklist below remains the original implementation plan, so use [`../docs/api.md`](../docs/api.md) and the current code as the source of truth for the shipped surface.

**Architecture:** Next.js 16 App Router on Vercel. Server-side data fetching via Paperclip REST API (EC2-B) and Mimir REST API (EC2-A). Feishu OAuth creates the signed session, all dashboard routes require sign-in, `/analytics` and `/settings` require the `board` role, and most live pages revalidate every 30 seconds while `/agents` refreshes every 15 seconds.

**Depends on:** Phase 0 (dashboard scaffold deployed), Phase 1-4 (Paperclip + Mimir populated with live data from agents)

---

## Project References

- **Dashboard Source**: `/Users/arthur/Desktop/SSGLAB/`
- **Design Spec**: `/Users/arthur/Desktop/SSGLAB/ssg-accelerator-agent-system-design.md` (section 12)
- **Phase 0 Plan**: `/Users/arthur/Desktop/SSGLAB/2026-03-29-ssg-dashboard-demo-phase0.md`
- **Paperclip API**: `https://board.ssgaccelerator.com/api/` (EC2-B)
- **Mimir API**: `https://api.allinmimir.com/api/v1/` (EC2-A)
- **Deployment**: Vercel at `dash.ssgaccelerator.com`

---

## Task 1: Update Paperclip API Client

**Goal:** Map actual Paperclip API responses to Dashboard TypeScript types. Handle pagination, error states, loading states.

**File:** `src/lib/paperclip.ts`

- [ ] **Step 1: Map actual Paperclip API endpoints to Dashboard types**

Review Paperclip API documentation and map each endpoint:

```typescript
// src/lib/paperclip.ts

// Mapping: Paperclip API → Dashboard types

// GET /api/companies/:id/agents → Agent[]
// Map: agent.status, schedule timing, and last heartbeat context

// GET /api/companies/:id/projects → Project[]
// Map: project.name, project.status, targetDate, updatedAt, goals

// GET /api/companies/:id/issues?projectId=:projectId → WorkItem[]
// Map: issue status, assignee, timestamps, and parent-child structure

// GET /api/companies/:id/dashboard → DashboardStats
// Aggregate endpoint for overview stats

// GET /api/companies/:id/heartbeat-runs?limit=:limit → HeartbeatRun[]
// Map: run status, timestamps, token usage, and first-line summary

// GET /api/companies/:id/costs/by-agent → AgentCostBreakdown[]
// Map: monthly cost and total token usage per agent

// Sourcing + matching: no live Paperclip endpoint is wired in this repo yet.
// Current implementation returns empty arrays and lets the UI show honest
// empty states until a real feed is available.
```

- [ ] **Step 2: Implement response mapping functions**

```typescript
// src/lib/paperclip.ts

function mapPaperclipIssueToProject(issue: PaperclipIssue): Project {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.body ?? "",
    status: issue.metadata?.stage ?? "contact",
    priority: issue.metadata?.priority ?? "medium",
    assigneeEmployee: issue.assignee?.name ?? "Unassigned",
    founderName: issue.metadata?.founderName ?? "",
    companyName: issue.metadata?.companyName ?? issue.title,
    stage: issue.metadata?.stage ?? "contact",
    daysInStage: calculateDaysInStage(issue),
    healthStatus: issue.metadata?.healthStatus ?? "on-track",
    lastActivity: issue.updatedAt,
    nextFollowUp: issue.metadata?.nextFollowUp,
    tags: issue.labels ?? [],
  };
}

// Similar mappers for SourcingResult, Match, Agent, HeartbeatRun
```

- [ ] **Step 3: Implement pagination handling**

```typescript
async function fetchPaperclipPaginated<T>(
  path: string,
  mapFn: (item: unknown) => T
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | null = null;
  do {
    const params = cursor ? `?cursor=${cursor}&limit=50` : "?limit=50";
    const res = await fetchPaperclip<PaginatedResponse>(`${path}${params}`);
    results.push(...res.data.map(mapFn));
    cursor = res.nextCursor;
  } while (cursor);
  return results;
}
```

- [ ] **Step 4: Implement error handling wrapper**

```typescript
// src/lib/paperclip.ts

interface ApiResult<T> {
  readonly data: T | null;
  readonly error: string | null;
  readonly loading: boolean;
}

async function safeFetchPaperclip<T>(path: string): Promise<ApiResult<T>> {
  try {
    const data = await fetchPaperclip<T>(path);
    return { data, error: null, loading: false };
  } catch (err) {
    console.error(`Paperclip API error [${path}]:`, err);
    return { data: null, error: err instanceof Error ? err.message : "Unknown error", loading: false };
  }
}
```

- [ ] **Step 5: Add cache headers for ISR**

```typescript
// Use Next.js ISR with 30-second revalidation
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${API_KEY}` },
  next: { revalidate: 30 },
});
```

---

## Task 2: Add Mimir API Client

**Goal:** Fetch project timelines, resource graph, and memory search results from Mimir.

**File:** Create `src/lib/mimir.ts`

- [ ] **Step 1: Create Mimir API client**

```typescript
// src/lib/mimir.ts
const MIMIR_URL = process.env.MIMIR_API_URL || "https://api.allinmimir.com";
const MIMIR_KEY = process.env.MIMIR_API_KEY || "";

async function fetchMimir<T>(path: string): Promise<T> {
  const res = await fetch(`${MIMIR_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${MIMIR_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Mimir API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
```

- [ ] **Step 2: Implement project timeline fetcher**

```typescript
// Get event_logs for a specific project (for project detail view)
export async function getProjectTimeline(projectName: string): Promise<EventLog[]> {
  return fetchMimir(`/api/v1/search?query=${encodeURIComponent(projectName)}&types=event_log&method=full&limit=50`);
}
```

- [ ] **Step 3: Implement resource graph fetcher**

```typescript
// Get resource entities and relations for the Resources page
export async function getResourceGraph(): Promise<ResourceGraph> {
  const entities = await fetchMimir<Entity[]>(`/api/v1/search?query=resource+connection+mentor+LP+partner&types=entity&method=full&limit=100`);
  // Group by category: connections, investors, mentors, programs
  return groupResourceEntities(entities);
}
```

- [ ] **Step 4: Implement memory search for Dashboard**

```typescript
// General search (used by search bar on Dashboard)
export async function searchMemory(query: string): Promise<SearchResult[]> {
  return fetchMimir(`/api/v1/search?query=${encodeURIComponent(query)}&method=full&limit=20`);
}
```

---

## Task 3: Replace Demo Data on Overview Page

**File:** `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Replace stats with live API calls**

```typescript
// Before: const stats = { totalProjects: 42, ... }
// After:
export default async function OverviewPage() {
  const stats = await getDashboardStats();
  // ...
}
```

- [ ] **Step 2: Replace recent matches with live data**

```typescript
const matches = await getMatches();
const recentMatches = matches
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5);
```

- [ ] **Step 3: Replace agent activity with live heartbeat runs**

```typescript
const heartbeatRuns = await getHeartbeatRuns();
const agentActivity = heartbeatRuns
  .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  .slice(0, 10)
  .map(run => ({
    time: formatTime(run.startedAt),
    agent: run.agentName,
    action: run.summary ?? `${run.status}`,
  }));
```

- [ ] **Step 4: Replace team activity with live Mimir data**

```typescript
const employees = await getEmployees();
const teamActivity = employees.map(emp => ({
  name: emp.name,
  inputs: emp.inputsThisWeek,
  bar: `w-[${Math.min((emp.inputsThisWeek / 25) * 100, 100)}%]`,
}));
```

- [ ] **Step 5: Replace pipeline distribution with live project counts**

```typescript
const projects = await getProjects();
const pipelineDist = [
  { stage: "Contact", count: projects.filter(p => p.status === "contact").length, color: "bg-sky-500" },
  { stage: "Diligence", count: projects.filter(p => p.status === "diligence").length, color: "bg-[var(--ssg-green)]" },
  { stage: "Decision", count: projects.filter(p => p.status === "decision").length, color: "bg-[var(--ssg-yellow)]" },
  { stage: "Accelerate", count: projects.filter(p => p.status === "acceleration").length, color: "bg-purple-500" },
  { stage: "Exit", count: projects.filter(p => p.status === "exit").length, color: "bg-orange-500" },
];
```

---

## Task 4: Replace Demo Data on Pipeline Page

**File:** `src/app/(dashboard)/pipeline/page.tsx`

- [ ] **Step 1: Fetch projects from Paperclip**

```typescript
export default async function PipelinePage() {
  const projects = await getProjects();
  const columns = buildKanbanColumns(projects);
  // ...
}

function buildKanbanColumns(projects: ReadonlyArray<Project>) {
  const stages = ["contact", "diligence", "decision", "acceleration", "exit"] as const;
  const titles: Record<string, string> = {
    contact: "Initial Contact",
    diligence: "Due Diligence",
    decision: "Investment Decision",
    acceleration: "Acceleration",
    exit: "Exit",
  };
  return stages.map(stage => ({
    title: titles[stage],
    projects: projects.filter(p => p.status === stage),
  }));
}
```

- [ ] **Step 2: Add project detail panel**

When a project card is clicked, show expanded detail with:
- Project info from Paperclip
- Timeline from Mimir event_logs (via `getProjectTimeline`)
- Recommendations from portfolio agent (stored as Paperclip comments)
- Related matches

```typescript
// src/components/pipeline/project-detail.tsx
// Fetch: Paperclip issue details + Mimir event_logs + Paperclip comments
```

- [ ] **Step 3: Add loading state for project detail**

```typescript
// Use React Suspense or loading.tsx for async data
export default function ProjectDetailLoading() {
  return <div className="animate-pulse">Loading project details...</div>;
}
```

---

## Task 5: Replace Demo Data on Agents Page

**File:** `src/app/(dashboard)/agents/page.tsx`

- [ ] **Step 1: Fetch agent status from Paperclip**

```typescript
export default async function AgentsPage() {
  const agents = await getAgents();
  const heartbeatRuns = await getHeartbeatRuns();
  // ...
}
```

- [ ] **Step 2: Map agent data to cards**

```typescript
const agentCards = agents.map(agent => {
  const agentRuns = heartbeatRuns.filter(r => r.agentId === agent.id);
  const lastRun = agentRuns[0];
  return {
    name: agent.name,
    status: agent.status === "running" ? "running" : agent.status === "error" ? "error" : "idle",
    lastHeartbeat: lastRun ? formatTime(lastRun.startedAt) : "Never",
    nextHeartbeat: agent.nextHeartbeat ? formatTime(agent.nextHeartbeat) : "—",
    todayRuns: agentRuns.filter(r => isToday(r.startedAt)).length,
    tokenUsage: formatTokens(agentRuns.filter(r => isToday(r.startedAt)).reduce((sum, r) => sum + r.tokenUsage, 0)),
    recentActions: agentRuns.slice(0, 3).map(r => `${formatTime(r.startedAt)} — ${r.summary ?? r.status}`),
  };
});
```

- [ ] **Step 3: Build heartbeat timeline from live data**

```typescript
const timeline = heartbeatRuns
  .filter(r => isToday(r.startedAt))
  .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  .map(r => ({
    time: formatTime(r.startedAt),
    agent: r.agentName,
    status: r.status,
    summary: r.summary ?? "",
    tokens: r.tokenUsage,
  }));
```

---

## Task 6: Replace Demo Data on Sourcing Page

**File:** `src/app/(dashboard)/sourcing/page.tsx`

- [ ] **Step 1: Fetch sourcing results from Paperclip**

```typescript
export default async function SourcingPage() {
  const results = await getSourcingResults();
  // Group by sourcing task for context
  // ...
}
```

- [ ] **Step 2: Implement domain filter with live data**

```typescript
// Extract unique domains from actual results
const domains = [...new Set(results.map(r => r.domain))];
// Render filter buttons dynamically
```

- [ ] **Step 3: Add action handlers**

"Create Project" button should call Paperclip API to create a project issue:
```typescript
// src/app/api/sourcing/create-project/route.ts
export async function POST(request: Request) {
  const { candidateId } = await request.json();
  // Fetch candidate from Paperclip
  // Create new project issue in Paperclip
  // Return new project ID
}
```

---

## Task 7: Replace Demo Data on Matching Page

**File:** `src/app/(dashboard)/matching/page.tsx`

- [ ] **Step 1: Fetch matches from Paperclip**

```typescript
export default async function MatchingPage() {
  const matches = await getMatches();
  // Sort by createdAt descending (newest first)
  // ...
}
```

- [ ] **Step 2: Add match type filter**

```typescript
// Filter tabs for all 6 match types
const types = ["all", "supply-demand", "resource", "talent", "investor", "cross-project", "mentor"];
```

- [ ] **Step 3: Add status filter**

```typescript
// Filter: pending, accepted, dismissed
```

- [ ] **Step 4: Add action handlers for match cards**

"Create Task" and "Dismiss" buttons should call Paperclip API:
```typescript
// src/app/api/matching/update-status/route.ts
export async function POST(request: Request) {
  const { matchId, status } = await request.json();
  // Update match issue status in Paperclip
}
```

---

## Task 8: Replace Demo Data on Analytics Page

**File:** `src/app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Calculate metrics from Paperclip + Mimir data**

```typescript
export default async function AnalyticsPage() {
  const sourcingResults = await getSourcingResults();
  const matches = await getMatches();
  const heartbeatRuns = await getHeartbeatRuns();
  const projects = await getProjects();

  // Sourcing hit rate: converted / total
  const hitRate = sourcingResults.filter(r => r.status === "converted").length / sourcingResults.length;

  // Match precision: accepted / (accepted + dismissed)
  const accepted = matches.filter(m => m.status === "accepted").length;
  const dismissed = matches.filter(m => m.status === "dismissed").length;
  const precision = accepted / (accepted + dismissed || 1);

  // Follow-up compliance: on-time / total due (from Paperclip subtasks)
  // Pipeline velocity: avg days per stage (from project data)
  // Agent costs: from heartbeat_run token usage

  // ...
}
```

- [ ] **Step 2: Implement weekly trend charts**

Aggregate metrics by week for the last 4 weeks:
```typescript
function getWeeklyTrend(items: ReadonlyArray<{ createdAt: string }>, weeks: number): number[] {
  // Group by week, count per week
}
```

- [ ] **Step 3: Calculate agent cost breakdown**

```typescript
const agentCosts = agents.map(agent => {
  const runs = heartbeatRuns.filter(r => r.agentId === agent.id);
  const todayTokens = runs.filter(r => isToday(r.startedAt)).reduce((sum, r) => sum + r.tokenUsage, 0);
  const estimatedCost = todayTokens * COST_PER_TOKEN; // Based on MiniMax M2.7 / Kimi K2.5 pricing
  return { agent: agent.name, tokens: todayTokens, cost: estimatedCost };
});
```

---

## Task 9: Replace Demo Data on Resources Page

**File:** `src/app/(dashboard)/resources/page.tsx`

- [ ] **Step 1: Fetch resource graph from Mimir**

```typescript
export default async function ResourcesPage() {
  const resourceGraph = await getResourceGraph();
  // resourceGraph: { connections: [], investors: [], mentors: [], programs: [] }
  // ...
}
```

- [ ] **Step 2: Render resource categories from live data**

```typescript
const categories = [
  { title: "Employee Connections", items: resourceGraph.connections },
  { title: "LP / Investor Network", items: resourceGraph.investors },
  { title: "Partner Programs", items: resourceGraph.programs },
  { title: "Mentors", items: resourceGraph.mentors },
];
```

---

## Task 10: Implement Feishu OAuth Login

**Goal:** Employees log in via their Feishu account. Board vs Employee role-based views.

- [ ] **Step 1: Create Feishu OAuth callback endpoint**

```typescript
// src/app/api/auth/feishu/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Exchange code for access token
  const tokenRes = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });

  // Get user info
  // Set session cookie
  // Redirect to dashboard
}
```

- [ ] **Step 2: Implement session management**

```typescript
// src/lib/auth.ts
// Use encrypted HTTP-only cookies for session
// Store: user_id, name, role (board | employee), feishu_open_id
```

- [ ] **Step 3: Implement role-based views**

```typescript
// Board role: sees all pages including Analytics and Settings
// Employee role: sees Overview, Pipeline (own projects), Agents (read-only),
//                Sourcing (own requests), Matching (own matches), Resources

// src/lib/auth.ts
export function requireRole(role: "board" | "employee") {
  // Middleware to check session role
  // Redirect to /login if not authenticated
  // Return 403 if role insufficient
}
```

- [ ] **Step 4: Update login page to redirect to Feishu OAuth**

```typescript
// src/app/login/page.tsx
// "Sign in with Feishu" button → redirect to Feishu OAuth URL:
// https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=...&redirect_uri=...&state=...
```

- [ ] **Step 5: Test login flow end-to-end**

1. Open `dash.ssgaccelerator.com/login`
2. Click "Sign in with Feishu"
3. Authorize in Feishu
4. Redirect back to dashboard
5. Verify correct role (Board for Arthur, Employee for others)

---

## Task 11: Add Loading States and Error Boundaries

**Goal:** Graceful UX when API calls are slow or fail.

- [ ] **Step 1: Create error boundary component**

```typescript
// src/components/ui/error-boundary.tsx
"use client";

interface ErrorBoundaryProps {
  readonly fallback: React.ReactNode;
  readonly children: React.ReactNode;
}

// Use React error boundary pattern
// Display: "Failed to load [section]. Retrying..." with retry button
```

- [ ] **Step 2: Create loading skeleton components**

```typescript
// src/components/ui/skeleton.tsx
export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="h-4 w-24 rounded bg-[var(--border)]" />
      <div className="mt-2 h-8 w-16 rounded bg-[var(--border)]" />
    </div>
  );
}

// Similar skeletons for ProjectCard, AgentCard, MatchCard, CandidateCard
```

- [ ] **Step 3: Add loading.tsx for each route**

```typescript
// src/app/(dashboard)/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}
```

- [ ] **Step 4: Implement fallback to demo data**

If Paperclip API is unreachable, show demo data with a banner:
```typescript
// "Unable to connect to live data. Showing demo data."
```

This ensures the dashboard is always presentable for stakeholder demos.

---

## Task 12: Add Real-Time Refresh

**Goal:** Dashboard updates automatically every 30 seconds for near-real-time agent monitoring.

- [ ] **Step 1: Implement client-side polling**

```typescript
// src/hooks/use-poll.ts
"use client";

import { useEffect, useState } from "react";

export function usePoll<T>(fetchFn: () => Promise<T>, intervalMs: number = 30000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const result = await fetchFn();
        if (mounted) { setData(result); setError(null); }
      } catch (err) {
        if (mounted) { setError(err instanceof Error ? err.message : "Poll failed"); }
      }
    };
    poll(); // Initial fetch
    const interval = setInterval(poll, intervalMs);
    return () => { mounted = false; clearInterval(interval); };
  }, [fetchFn, intervalMs]);

  return { data, error };
}
```

- [ ] **Step 2: Apply polling to agent status page**

The Agents page is most time-sensitive (need to see running/idle/error in real time):
```typescript
// src/app/(dashboard)/agents/page.tsx — client component wrapper
// Poll agent status every 15 seconds
// Poll heartbeat runs every 30 seconds
```

- [ ] **Step 3: Apply polling to Overview page**

Stats and recent matches refresh every 30 seconds.

- [ ] **Step 4: Consider SSE upgrade path**

For future: Paperclip could emit Server-Sent Events for agent status changes, heartbeat completions, and new matches. Dashboard subscribes to SSE stream for instant updates. Document this as a future optimization.

---

## Task 13: Set Environment Variables on Vercel

**Goal:** Configure production environment variables for the live Dashboard.

- [ ] **Step 1: Set Paperclip API variables**

```bash
vercel env add PAPERCLIP_API_URL production
# Value: https://board.ssgaccelerator.com

vercel env add PAPERCLIP_API_KEY production
# Value: <Paperclip API key from Phase 1>

vercel env add PAPERCLIP_COMPANY_ID production
# Value: <Company ID from Phase 1>
```

- [ ] **Step 2: Set Mimir API variables**

```bash
vercel env add MIMIR_API_URL production
# Value: https://api.allinmimir.com

vercel env add MIMIR_API_KEY production
# Value: <Mimir API key>
```

- [ ] **Step 3: Set Feishu OAuth variables**

```bash
vercel env add FEISHU_APP_ID production
# Value: <Feishu app ID>

vercel env add FEISHU_APP_SECRET production
# Value: <Feishu app secret>

vercel env add NEXTAUTH_SECRET production
# Value: <generated secret>

vercel env add NEXTAUTH_URL production
# Value: https://dash.ssgaccelerator.com
```

- [ ] **Step 4: Update .env.example with all variables**

```bash
# Paperclip API
PAPERCLIP_API_URL=https://board.ssgaccelerator.com
PAPERCLIP_API_KEY=
PAPERCLIP_COMPANY_ID=

# Mimir API
MIMIR_API_URL=https://api.allinmimir.com
MIMIR_API_KEY=

# Feishu OAuth
FEISHU_APP_ID=
FEISHU_APP_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://dash.ssgaccelerator.com
```

---

## Task 14: Deploy and Verify All Pages

**Goal:** All dashboard pages show live data from Paperclip + Mimir.

- [ ] **Step 1: Deploy to Vercel**

```bash
cd /Users/arthur/Desktop/SSGLAB
git add -A
git commit -m "feat: replace demo data with live Paperclip + Mimir APIs"
git push origin main
# Vercel auto-deploys from main
```

- [ ] **Step 2: Verify Overview page**

Open `dash.ssgaccelerator.com`:
- Stats show live project count, insights, agent status
- Recent matches from actual matching agent
- Pipeline distribution from actual projects
- Agent activity from actual heartbeat runs
- Team activity from actual Mimir event_logs

- [ ] **Step 3: Verify Pipeline page**

- Projects in correct kanban columns
- Health badges match portfolio agent assessments
- Clicking a card shows live timeline from Mimir

- [ ] **Step 4: Verify Agents page**

- Agent statuses reflect current state (running/idle/error)
- Heartbeat timeline shows today's actual runs
- Token usage calculated from real data

- [ ] **Step 5: Verify Sourcing page**

- Actual sourcing results from sourcing agent
- Domain filters work with real data
- "Create Project" button creates real Paperclip issue

- [ ] **Step 6: Verify Matching page**

- Actual matches from matching agent
- All 6 match types represented (if data exists)
- "Create Task" and "Dismiss" buttons work

- [ ] **Step 7: Verify Analytics page**

- Metrics calculated from real data
- Trend charts show actual weekly trends
- Agent cost breakdown reflects real token usage

- [ ] **Step 8: Verify Resources page**

- Resource graph from Mimir (seeded in Phase 1, updated by agents)

- [ ] **Step 9: Verify Login flow**

- Feishu OAuth works
- Board role sees all pages
- Employee role sees restricted pages

- [ ] **Step 10: Verify real-time refresh**

- Open Agents page in browser
- Trigger a heartbeat manually
- Verify the page updates within 30 seconds without manual refresh

---

## Phase 5 Completion Checklist

After all 14 tasks:

- [ ] Paperclip API client maps all endpoints to Dashboard types
- [ ] Pagination handled for large datasets
- [ ] Error handling shows graceful fallbacks (not blank pages)
- [ ] Mimir API client fetches project timelines, resource graph, search results
- [ ] Overview page shows live stats, matches, pipeline, activity
- [ ] Pipeline page shows live projects in kanban columns
- [ ] Pipeline project detail shows Mimir timeline
- [ ] Agents page shows live agent status and heartbeat timeline
- [ ] Sourcing page shows live results with working action buttons
- [ ] Matching page shows live matches with working action buttons
- [ ] Analytics page calculates metrics from real data
- [ ] Resources page shows live resource graph from Mimir
- [ ] Feishu OAuth login works with role-based views (Board vs Employee)
- [ ] Loading skeletons show during data fetch
- [ ] Error boundaries prevent blank pages on API failure
- [ ] Demo data fallback when APIs are unreachable
- [ ] Real-time refresh (30s polling) on Agents and Overview pages
- [ ] Environment variables set on Vercel
- [ ] All pages verified with live data at `dash.ssgaccelerator.com`
- [ ] SSG brand maintained: mint green #62feca, Space Grotesk, dark theme

---

## System Complete

With Phase 5 done, the full SSG Accelerator Agent System is live:

1. **Employees** talk to the Feishu bot → information stored in Mimir
2. **Sourcing Agent** finds founders → results in Mimir + Feishu cards
3. **Matching Agent** connects dots → matches in Mimir + Feishu group chat
4. **Portfolio Agent** manages pipeline → daily digests in Feishu
5. **Dashboard** shows everything → live at `dash.ssgaccelerator.com`

All data flows through Paperclip (control) + Mimir (memory). Dashboard reads the same APIs that agents write to. Zero throwaway work from Phase 0 demo to Phase 5 production.
