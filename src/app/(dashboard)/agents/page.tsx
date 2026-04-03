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
import { getAgents, getTeamActivityRuns } from "@/lib/paperclip";

export const revalidate = 15;

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
    getTeamActivityRuns(40, 15),
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
      : [];

  const heartbeatEntries =
    liveRuns.length > 0
      ? (liveRuns.filter((run) => isSameDay(run.activityAt)).length > 0
          ? liveRuns.filter((run) => isSameDay(run.activityAt))
          : liveRuns
        )
          .slice(0, 12)
          .map((run) => ({
            time: formatClockTime(run.activityAt),
            agentName: run.agentName,
            status: mapTimelineStatus(run.status),
            tokens: run.tokenUsage,
            summary: truncateText(run.summary ?? run.status, 120),
          }))
      : [];

  return (
    <div className="space-y-8">
      <AutoRefresh intervalMs={15_000} />
      <Header
        title="Team"
        description="Monitor team status, automation timing, and recent execution history."
        eyebrow="Team Visibility"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            This page tracks team status, recent execution history, and upcoming
            check-ins.
          </p>
          {isFallback && <Badge variant="warning">Snapshot View</Badge>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {agentCards.length > 0 ? (
          agentCards.map((agent) => <AgentCard key={agent.name} {...agent} />)
        ) : (
          <Card className="border-dashed border-[var(--border)]/80 bg-black/10 lg:col-span-3">
            <p className="text-base font-semibold text-[var(--foreground)]">
              No agent activity yet
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              This workspace does not have live agent heartbeat data yet. The
              team view stays empty instead of showing internal delivery
              operators.
            </p>
          </Card>
        )}
      </div>

      {heartbeatEntries.length > 0 ? (
        <HeartbeatTimeline entries={heartbeatEntries} />
      ) : (
        <Card className="border-dashed border-[var(--border)]/80 bg-black/10">
          <p className="text-base font-semibold text-[var(--foreground)]">
            No automation runs recorded today
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Daily heartbeat and token activity will appear here once the live
            team feed starts reporting for this workspace.
          </p>
        </Card>
      )}
    </div>
  );
}
