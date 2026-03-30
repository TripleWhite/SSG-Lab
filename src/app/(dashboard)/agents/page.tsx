import { AgentCard } from "@/components/agents/agent-card";
import { HeartbeatTimeline } from "@/components/agents/heartbeat-timeline";
import { Header } from "@/components/nav/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import {
  formatClockTime,
  formatCompactNumber,
  formatRelativeTime,
  isSameDay,
  truncateText,
} from "@/lib/format";
import { getAgents, getHeartbeatRuns } from "@/lib/paperclip";

export const revalidate = 15;

const FALLBACK_AGENTS = [
  {
    name: "Frontend Engineer",
    status: "running" as const,
    lastHeartbeat: "2 min ago",
    nextHeartbeat: "In 8 min",
    todayRuns: 6,
    tokenUsage: "18.4k tokens",
    recentActions: [
      {
        time: "09:47",
        description: "Mapped heartbeat runs into the Overview page",
      },
      {
        time: "09:35",
        description: "Replaced dashboard stats with live Paperclip totals",
      },
      {
        time: "09:20",
        description: "Added fallback handling for unreachable APIs",
      },
      {
        time: "09:10",
        description: "Prepared analytics cost breakdown wiring",
      },
    ],
  },
  {
    name: "QA Engineer",
    status: "idle" as const,
    lastHeartbeat: "18 min ago",
    nextHeartbeat: "In 2 min",
    todayRuns: 6,
    tokenUsage: "12.1k tokens",
    recentActions: [
      { time: "09:31", description: "Prepared live-data regression checklist" },
      {
        time: "09:15",
        description: "Queued dashboard verification after review",
      },
      {
        time: "08:50",
        description: "Synced issue coverage with the Phase 5 plan",
      },
      {
        time: "08:30",
        description: "Reviewed empty-state handling for dashboard routes",
      },
    ],
  },
  {
    name: "CTO",
    status: "error" as const,
    lastHeartbeat: "35 min ago",
    nextHeartbeat: "Queued",
    todayRuns: 9,
    tokenUsage: "22.7k tokens",
    recentActions: [
      { time: "09:44", description: "Coordinated the Phase 5 review chain" },
      {
        time: "09:32",
        description: "Escalated upstream blockers on credentials",
      },
      {
        time: "09:18",
        description: "Assigned QA and documentation follow-up tasks",
      },
      { time: "09:05", description: "Reviewed the implementation wave plan" },
    ],
  },
];

const FALLBACK_HEARTBEAT_ENTRIES = [
  {
    time: "09:47",
    agentName: "Frontend Engineer",
    status: "ok" as const,
    tokens: 3210,
    summary: "Completed Paperclip dashboard sync for the Overview route",
  },
  {
    time: "09:44",
    agentName: "CTO",
    status: "ok" as const,
    tokens: 2870,
    summary: "Reviewed the Phase 5 implementation sequence and review handoff",
  },
  {
    time: "09:35",
    agentName: "QA Engineer",
    status: "ok" as const,
    tokens: 4100,
    summary:
      "Prepared dashboard verification cases for live and fallback states",
  },
  {
    time: "09:32",
    agentName: "Frontend Engineer",
    status: "slow" as const,
    tokens: 5640,
    summary:
      "Client polling work deferred while live server-rendered data is landed first",
  },
];

function mapAgentStatus(status: string): "running" | "idle" | "error" {
  if (status === "running") {
    return "running";
  }
  if (status === "error") {
    return "error";
  }
  return "idle";
}

function mapTimelineStatus(status: string): "ok" | "slow" | "missed" {
  if (status === "succeeded") {
    return "ok";
  }
  if (status === "running") {
    return "slow";
  }
  return "missed";
}

export default async function AgentsPage() {
  const [agentsResult, runsResult] = await Promise.allSettled([
    getAgents(15),
    getHeartbeatRuns(40, 15),
  ]);
  const isFallback =
    agentsResult.status === "rejected" || runsResult.status === "rejected";

  const liveAgents =
    agentsResult.status === "fulfilled"
      ? agentsResult.value.map((agent) => ({
          name: agent.name,
          status: mapAgentStatus(agent.status),
          lastHeartbeat: agent.lastHeartbeat
            ? formatRelativeTime(agent.lastHeartbeat)
            : "Never",
          nextHeartbeat: agent.nextHeartbeat
            ? formatRelativeTime(agent.nextHeartbeat)
            : "Queued",
          todayRuns: agent.todayRuns,
          tokenUsage: `${formatCompactNumber(agent.tokenUsageToday)} tokens`,
          recentActions: [] as Array<{ time: string; description: string }>,
        }))
      : [];
  const liveRuns = runsResult.status === "fulfilled" ? runsResult.value : [];

  const agentCards =
    liveAgents.length > 0
      ? liveAgents.map((agent) => {
          const runsForAgent = liveRuns
            .filter((run) => run.agentName === agent.name)
            .slice(0, 4);
          return {
            ...agent,
            recentActions: runsForAgent.map((run) => ({
              time: formatClockTime(run.activityAt),
              description: truncateText(run.summary ?? run.status, 96),
            })),
          };
        })
      : FALLBACK_AGENTS;

  const heartbeatEntries =
    liveRuns.length > 0
      ? liveRuns
          .filter((run) => isSameDay(run.activityAt))
          .slice(0, 12)
          .map((run) => ({
            time: formatClockTime(run.activityAt),
            agentName: run.agentName,
            status: mapTimelineStatus(run.status),
            tokens: run.tokenUsage,
            summary: truncateText(run.summary ?? run.status, 120),
          }))
      : FALLBACK_HEARTBEAT_ENTRIES;

  return (
    <div className="space-y-8">
      <AutoRefresh intervalMs={15_000} />
      <Header
        title="Agents"
        description="Monitor agent status and heartbeat history"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            This page now reads live agent state, schedule timing, and heartbeat
            runs from Paperclip.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="info">15s Refresh</Badge>
            {isFallback && <Badge variant="warning">Fallback Active</Badge>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {agentCards.map((agent) => (
          <AgentCard key={agent.name} {...agent} />
        ))}
      </div>

      <HeartbeatTimeline entries={heartbeatEntries} />
    </div>
  );
}
