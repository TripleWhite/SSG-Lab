import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { requireBoard } from "@/lib/auth";
import { formatCompactNumber, formatWeekLabel, getWeekKey } from "@/lib/format";
import {
  getAgentCosts,
  getDashboardStats,
  getHeartbeatRuns,
} from "@/lib/paperclip";

const FALLBACK_STATS = {
  runSuccessRate: 92,
  inProgressTasks: 4,
  completedTasks: 28,
} as const;

const FALLBACK_WEEKLY_DATA = {
  runVolume: [
    { week: "Mar 4", value: 12 },
    { week: "Mar 11", value: 18 },
    { week: "Mar 18", value: 23 },
    { week: "Mar 25", value: 31 },
  ],
  successRate: [
    { week: "Mar 4", value: 78 },
    { week: "Mar 11", value: 83 },
    { week: "Mar 18", value: 89 },
    { week: "Mar 25", value: 92 },
  ],
} as const;

const FALLBACK_COST_BREAKDOWN = [
  { agent: "Frontend Engineer", cost: "$8.21/mo", tokens: "514k tokens" },
  { agent: "QA Engineer", cost: "$8.51/mo", tokens: "306k tokens" },
  { agent: "CTO", cost: "$286.84/mo", tokens: "1.8M tokens" },
] as const;

interface BarChartProps {
  title: string;
  data: ReadonlyArray<{ week: string; value: number }>;
  maxValue?: number;
  valueSuffix?: string;
}

function BarChart({
  title,
  data,
  maxValue = 100,
  valueSuffix = "%",
}: BarChartProps) {
  return (
    <Card>
      <CardTitle className="mb-4">{title}</CardTitle>
      <div className="flex items-end gap-3 h-32">
        {data.map(({ week, value }) => {
          const heightPct = Math.round((value / maxValue) * 100);
          return (
            <div
              key={week}
              className="flex flex-1 flex-col items-center gap-1 h-full"
            >
              <span className="text-xs font-medium text-[var(--foreground)]">
                {value}
                {valueSuffix}
              </span>
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${heightPct}%`,
                    background:
                      "linear-gradient(to top, var(--ssg-green), var(--ssg-yellow))",
                  }}
                />
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                {week}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function buildWeeklyRunVolume(
  runs: Awaited<ReturnType<typeof getHeartbeatRuns>>,
) {
  const counts = new Map<string, number>();
  for (const run of runs) {
    const key = getWeekKey(run.activityAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-4)
    .map(([week, value]) => ({ week: formatWeekLabel(week), value }));
}

function buildWeeklySuccessRate(
  runs: Awaited<ReturnType<typeof getHeartbeatRuns>>,
) {
  const counts = new Map<string, { total: number; successful: number }>();
  for (const run of runs) {
    const key = getWeekKey(run.activityAt);
    const current = counts.get(key) ?? { total: 0, successful: 0 };
    if (run.status !== "running") {
      current.total += 1;
      if (run.status === "succeeded") {
        current.successful += 1;
      }
    }
    counts.set(key, current);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-4)
    .map(([week, value]) => ({
      week: formatWeekLabel(week),
      value:
        value.total === 0
          ? 100
          : Math.round((value.successful / value.total) * 100),
    }));
}

export default async function AnalyticsPage() {
  await requireBoard();

  const [statsResult, runsResult, costsResult] = await Promise.allSettled([
    getDashboardStats(),
    getHeartbeatRuns(120),
    getAgentCosts(),
  ]);

  const isFallback =
    statsResult.status === "rejected" ||
    runsResult.status === "rejected" ||
    costsResult.status === "rejected";

  const stats =
    statsResult.status === "fulfilled" ? statsResult.value : FALLBACK_STATS;
  const runs = runsResult.status === "fulfilled" ? runsResult.value : [];
  const costs = costsResult.status === "fulfilled" ? costsResult.value : [];

  const weeklyRunVolume =
    runs.length > 0
      ? buildWeeklyRunVolume(runs)
      : [...FALLBACK_WEEKLY_DATA.runVolume];
  const weeklySuccessRate =
    runs.length > 0
      ? buildWeeklySuccessRate(runs)
      : [...FALLBACK_WEEKLY_DATA.successRate];
  const costBreakdown =
    costs.length > 0
      ? costs
          .sort((left, right) => right.costCents - left.costCents)
          .slice(0, 6)
          .map((entry) => ({
            agent: entry.agentName,
            cost: `$${(entry.costCents / 100).toFixed(2)}/mo`,
            tokens: `${formatCompactNumber(entry.totalTokens)} tokens`,
          }))
      : [...FALLBACK_COST_BREAKDOWN];

  return (
    <div className="space-y-8">
      <Header
        title="Analytics"
        description="Live operational metrics from Paperclip runs and costs"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            Analytics now reflects Paperclip heartbeat success, task throughput,
            and agent cost data.
          </p>
          {isFallback && <Badge variant="warning">Fallback Active</Badge>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          label="Run Success Rate"
          value={`${stats.runSuccessRate}%`}
          trend="Recent heartbeat completions"
        />
        <StatCard
          label="Tasks In Progress"
          value={stats.inProgressTasks}
          trend="Current active delivery work"
        />
        <StatCard
          label="Tasks Done"
          value={stats.completedTasks}
          trend="Lifetime completed work"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <BarChart
          title="Heartbeat Runs (Weekly)"
          data={weeklyRunVolume}
          maxValue={Math.max(...weeklyRunVolume.map((item) => item.value), 1)}
          valueSuffix=""
        />
        <BarChart
          title="Run Success (Weekly)"
          data={weeklySuccessRate}
          maxValue={100}
        />
      </div>

      <Card>
        <CardTitle className="mb-4">Agent Cost Breakdown</CardTitle>
        <div className="divide-y divide-[var(--border)]">
          {costBreakdown.map(({ agent, cost, tokens }) => (
            <div
              key={agent}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="font-medium">{agent}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  {tokens}
                </span>
                <span className="text-sm font-semibold text-[var(--ssg-green)]">
                  {cost}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
