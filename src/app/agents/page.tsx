import { AgentCard } from "@/components/agents/agent-card";
import { HeartbeatTimeline } from "@/components/agents/heartbeat-timeline";

const AGENTS = [
  {
    name: "Sourcing Agent",
    status: "running" as const,
    lastHeartbeat: "2 min ago",
    nextHeartbeat: "In 8 min",
    todayRuns: 14,
    tokenUsage: "38.4k tokens",
    recentActions: [
      { time: "09:47", description: "Scraped 12 new startups from Y Combinator W25 batch" },
      { time: "09:35", description: "Enriched 8 company profiles via Clearbit API" },
      { time: "09:20", description: "Deduplication pass — removed 3 duplicate entries" },
      { time: "09:10", description: "Ingested LinkedIn data for founders in SaaS sector" },
    ],
  },
  {
    name: "Portfolio Agent",
    status: "idle" as const,
    lastHeartbeat: "18 min ago",
    nextHeartbeat: "In 2 min",
    todayRuns: 6,
    tokenUsage: "12.1k tokens",
    recentActions: [
      { time: "09:31", description: "Updated KPI summaries for 4 portfolio companies" },
      { time: "09:15", description: "Flagged HealthTrack for follow-up — ARR dip detected" },
      { time: "08:50", description: "Generated weekly digest for 11 active investments" },
      { time: "08:30", description: "Synced Notion workspace with latest funding round data" },
    ],
  },
  {
    name: "Matching Agent",
    status: "running" as const,
    lastHeartbeat: "5 min ago",
    nextHeartbeat: "In 5 min",
    todayRuns: 9,
    tokenUsage: "22.7k tokens",
    recentActions: [
      { time: "09:44", description: "Matched DesignAI to 3 strategic LP introductions" },
      { time: "09:32", description: "Scored 24 inbound leads — avg fit score 0.71" },
      { time: "09:18", description: "Re-ranked FinPilot against updated thesis criteria" },
      { time: "09:05", description: "Cluster analysis complete — 2 new sector themes surfaced" },
    ],
  },
];

const HEARTBEAT_ENTRIES = [
  {
    time: "09:47",
    agentName: "Sourcing Agent",
    status: "ok" as const,
    tokens: 3210,
    summary: "Completed Y Combinator batch scrape; 12 companies added to pipeline",
  },
  {
    time: "09:44",
    agentName: "Matching Agent",
    status: "ok" as const,
    tokens: 2870,
    summary: "LP intro matching run finished; 3 high-confidence pairings flagged for review",
  },
  {
    time: "09:35",
    agentName: "Sourcing Agent",
    status: "ok" as const,
    tokens: 4100,
    summary: "Clearbit enrichment batch processed; 8 profiles updated with firmographic data",
  },
  {
    time: "09:32",
    agentName: "Matching Agent",
    status: "slow" as const,
    tokens: 5640,
    summary: "Lead scoring run delayed — OpenAI rate limit hit; completed after 45 s backoff",
  },
  {
    time: "09:31",
    agentName: "Portfolio Agent",
    status: "ok" as const,
    tokens: 1980,
    summary: "KPI summaries refreshed for Q1 cohort; HealthTrack anomaly logged",
  },
  {
    time: "09:18",
    agentName: "Matching Agent",
    status: "ok" as const,
    tokens: 2340,
    summary: "FinPilot thesis re-rank complete; fit score updated from 0.62 → 0.79",
  },
  {
    time: "09:10",
    agentName: "Sourcing Agent",
    status: "ok" as const,
    tokens: 3760,
    summary: "LinkedIn ingestion run finished; 31 founder profiles indexed across 9 companies",
  },
];

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Monitor agent status and heartbeat history
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <AgentCard key={agent.name} {...agent} />
        ))}
      </div>

      <HeartbeatTimeline entries={HEARTBEAT_ENTRIES} />
    </div>
  );
}
