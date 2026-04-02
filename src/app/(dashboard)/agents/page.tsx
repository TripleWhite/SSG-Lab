import { AgentCard } from "@/components/agents/agent-card";
import { HeartbeatTimeline } from "@/components/agents/heartbeat-timeline";
import { Header } from "@/components/nav/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import {
  formatClockTime,
  formatCompactNumber,
  formatRelativeTime,
  isSameDay,
  truncateText,
} from "@/lib/format";
import { getAgents, getHeartbeatRuns } from "@/lib/paperclip";
import { ArrowUpRight, Bot, Clock3, ShieldAlert } from "lucide-react";
import Link from "next/link";

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
  const teamEmptyState = isFallback
    ? {
        title: "Team feed unavailable",
        body: "We could not load live agent heartbeat data right now. The shell stays customer-safe until the team feed responds again.",
        eyebrow: "Refresh pending",
        note: "Re-open pipeline status while the team feed reconnects.",
        tone: "danger" as const,
        href: "/pipeline",
        action: "Open pipeline",
        icon: ShieldAlert,
      }
    : {
        title: "No team activity yet",
        body: "This workspace has no live agent heartbeat data yet, so the team board stays focused on the shell instead of placeholder operators.",
        eyebrow: "Awaiting first heartbeat",
        note: "Agent status cards will appear here automatically after the first live run.",
        tone: "warning" as const,
        href: "/pipeline",
        action: "Open pipeline",
        icon: Bot,
      };
  const timelineEmptyState = isFallback
    ? {
        title: "Timeline refresh pending",
        body: "The run timeline will repopulate after the next successful team heartbeat sync.",
        eyebrow: "Awaiting telemetry",
        tone: "danger" as const,
      }
    : {
        title: "No automation runs recorded yet",
        body: "Daily heartbeat and token activity will appear here once the first live team run lands in this workspace.",
        eyebrow: "Awaiting first run",
        tone: "warning" as const,
      };
  const TeamEmptyStateIcon = teamEmptyState.icon;

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
          <Card className="overflow-hidden border-dashed border-[var(--border)]/80 bg-[linear-gradient(180deg,rgba(19,24,24,0.94),rgba(10,10,15,0.98))] p-0 lg:col-span-3">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto,1fr,auto] lg:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-[var(--border)] bg-black/20 text-[var(--ssg-green)]">
                <TeamEmptyStateIcon size={24} />
              </div>
              <div className="space-y-3">
                <Badge variant={teamEmptyState.tone}>
                  {teamEmptyState.eyebrow}
                </Badge>
                <div>
                  <CardTitle className="mb-2 text-2xl">
                    {teamEmptyState.title}
                  </CardTitle>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {teamEmptyState.body}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {teamEmptyState.note}
                </p>
              </div>
              <Link
                href={teamEmptyState.href}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-[var(--border)] bg-black/20 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--ssg-green)]/40 hover:bg-[var(--card-hover)]"
              >
                {teamEmptyState.action}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </Card>
        )}
      </div>

      {heartbeatEntries.length > 0 ? (
        <HeartbeatTimeline entries={heartbeatEntries} />
      ) : (
        <Card className="overflow-hidden border-dashed border-[var(--border)]/80 bg-[linear-gradient(180deg,rgba(19,24,24,0.94),rgba(10,10,15,0.98))] p-0">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto,1fr] lg:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-[var(--border)] bg-black/20 text-[var(--ssg-green)]">
              <Clock3 size={24} />
            </div>
            <div className="space-y-3">
              <Badge variant={timelineEmptyState.tone}>
                {timelineEmptyState.eyebrow}
              </Badge>
              <div>
                <CardTitle className="mb-2 text-2xl">
                  {timelineEmptyState.title}
                </CardTitle>
                <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                  {timelineEmptyState.body}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
