import { Briefcase, Lightbulb, Bot, Target } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Header } from "@/components/nav/header";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const RECENT_MATCHES = [
  {
    sideA: "DesignAI",
    sideB: "Acme Ventures",
    employees: 24,
    type: "Strategic",
    confidence: 94,
  },
  {
    sideA: "LogiFlow",
    sideB: "Peak Capital",
    employees: 11,
    type: "Acqui-hire",
    confidence: 81,
  },
  {
    sideA: "NovaMed",
    sideB: "HealthBridge",
    employees: 38,
    type: "Partnership",
    confidence: 87,
  },
] as const;

const PIPELINE_STAGES = [
  { label: "Contact", count: 12, color: "var(--ssg-green)" },
  { label: "Diligence", count: 8, color: "var(--ssg-yellow)" },
  { label: "Decision", count: 3, color: "#a78bfa" },
  { label: "Accelerate", count: 15, color: "#38bdf8" },
  { label: "Exit", count: 4, color: "#fb7185" },
] as const;

const PIPELINE_MAX = Math.max(...PIPELINE_STAGES.map((s) => s.count));

const AGENT_ACTIVITY = [
  {
    time: "2m ago",
    agent: "Sourcing",
    action: "Identified 3 new targets in SaaS vertical",
  },
  {
    time: "8m ago",
    agent: "Matching",
    action: "Scored DesignAI ↔ Acme Ventures at 94%",
  },
  {
    time: "14m ago",
    agent: "Insights",
    action: "Generated weekly pipeline summary report",
  },
  {
    time: "31m ago",
    agent: "Sourcing",
    action: "Scraped 120 LinkedIn profiles via enrichment",
  },
  {
    time: "1h ago",
    agent: "Matching",
    action: "Re-ranked 18 portfolio matches post-signal",
  },
] as const;

const TEAM_ACTIVITY = [
  { name: "Sarah K.", inputs: 34 },
  { name: "James R.", inputs: 27 },
  { name: "Priya N.", inputs: 22 },
  { name: "Marco L.", inputs: 15 },
  { name: "Aisha T.", inputs: 9 },
] as const;

const TEAM_MAX = Math.max(...TEAM_ACTIVITY.map((m) => m.inputs));

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <Header title="Overview" description="SSG Accelerator Agent Dashboard" />

      {/* Stats row */}
      <div className="animate-fade-in grid grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={42}
          trend="+3 this week"
          icon={<Briefcase size={20} />}
        />
        <StatCard
          label="Insights This Week"
          value={12}
          icon={<Lightbulb size={20} />}
        />
        <StatCard label="Agents Online" value="3/3" icon={<Bot size={20} />} />
        <StatCard
          label="Match Accuracy"
          value="87%"
          icon={<Target size={20} />}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left column */}
        <div
          className="animate-fade-in space-y-6"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Recent Matches */}
          <Card>
            <CardTitle className="mb-4">Recent Matches</CardTitle>
            <ul className="space-y-3">
              {RECENT_MATCHES.map((m) => (
                <li
                  key={`${m.sideA}-${m.sideB}`}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {m.sideA}{" "}
                      <span className="text-[var(--muted-foreground)]">↔</span>{" "}
                      {m.sideB}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {m.employees} employees
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{m.type}</Badge>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "var(--ssg-green)" }}
                    >
                      {m.confidence}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Pipeline Distribution */}
          <Card>
            <CardTitle className="mb-4">Pipeline Distribution</CardTitle>
            <ul className="space-y-3">
              {PIPELINE_STAGES.map((stage) => (
                <li key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">
                      {stage.label}
                    </span>
                    <span className="font-medium">{stage.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(stage.count / PIPELINE_MAX) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right column */}
        <div
          className="animate-fade-in space-y-6"
          style={{ animationDelay: "0.2s" }}
        >
          {/* Agent Activity */}
          <Card>
            <CardTitle className="mb-4">Agent Activity</CardTitle>
            <ul className="space-y-4">
              {AGENT_ACTIVITY.map((entry, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-xs text-[var(--muted-foreground)] w-12">
                    {entry.time}
                  </span>
                  <div className="flex items-start gap-2">
                    <Badge variant="info">{entry.agent}</Badge>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {entry.action}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Team Activity */}
          <Card>
            <CardTitle className="mb-4">Team Activity</CardTitle>
            <ul className="space-y-4">
              {TEAM_ACTIVITY.map((member) => (
                <li key={member.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {member.inputs} inputs
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(member.inputs / TEAM_MAX) * 100}%`,
                        background:
                          "linear-gradient(to right, var(--ssg-green), var(--ssg-yellow))",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
