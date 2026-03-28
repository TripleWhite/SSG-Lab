import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

const WEEKLY_BAR_DATA = {
  sourcingHitRate: [
    { week: "W1", value: 24 },
    { week: "W2", value: 27 },
    { week: "W3", value: 29 },
    { week: "W4", value: 32 },
  ],
  matchPrecision: [
    { week: "W1", value: 40 },
    { week: "W2", value: 45 },
    { week: "W3", value: 50 },
    { week: "W4", value: 54 },
  ],
} as const;

const COST_BREAKDOWN = [
  { agent: "Sourcing", cost: "$8.50/day", tokens: "142k tokens" },
  { agent: "Portfolio", cost: "$1.80/day", tokens: "28k tokens" },
  { agent: "Matching", cost: "$1.20/day", tokens: "18k tokens" },
  { agent: "Feishu Bot", cost: "$1.50/day", tokens: "24k tokens" },
] as const;

interface BarChartProps {
  title: string;
  data: ReadonlyArray<{ week: string; value: number }>;
  maxValue?: number;
}

function BarChart({ title, data, maxValue = 100 }: BarChartProps) {
  return (
    <Card>
      <CardTitle className="mb-4">{title}</CardTitle>
      <div className="flex items-end gap-3 h-32">
        {data.map(({ week, value }) => {
          const heightPct = Math.round((value / maxValue) * 100);
          return (
            <div key={week} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-[var(--foreground)]">
                {value}%
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
              <span className="text-xs text-[var(--muted)]">{week}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <Header
        title="Analytics"
        description="System performance and benchmarks"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          label="Sourcing Hit Rate"
          value="32%"
          trend="+5% vs last week"
        />
        <StatCard
          label="Match Precision"
          value="54%"
          trend="+8% vs last week"
        />
        <StatCard
          label="Follow-up Compliance"
          value="91%"
          trend="+2% vs last week"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <BarChart
          title="Sourcing Hit Rate (Weekly)"
          data={WEEKLY_BAR_DATA.sourcingHitRate}
          maxValue={50}
        />
        <BarChart
          title="Match Precision (Weekly)"
          data={WEEKLY_BAR_DATA.matchPrecision}
          maxValue={70}
        />
      </div>

      <Card>
        <CardTitle className="mb-4">Agent Cost Breakdown</CardTitle>
        <div className="divide-y divide-[var(--border)]">
          {COST_BREAKDOWN.map(({ agent, cost, tokens }) => (
            <div
              key={agent}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="font-medium">{agent}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--muted)]">{tokens}</span>
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
