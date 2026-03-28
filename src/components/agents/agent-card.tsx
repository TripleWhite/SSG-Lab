import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type ReactNode } from "react";

type AgentStatus = "running" | "idle" | "error";

const statusVariant: Record<AgentStatus, "success" | "info" | "danger"> = {
  running: "success",
  idle: "info",
  error: "danger",
};

const statusLabel: Record<AgentStatus, string> = {
  running: "Running",
  idle: "Idle",
  error: "Error",
};

interface AgentAction {
  time: string;
  description: string;
}

interface AgentCardProps {
  name: string;
  status: AgentStatus;
  lastHeartbeat: string;
  nextHeartbeat: string;
  todayRuns: number;
  tokenUsage: string;
  recentActions: AgentAction[];
}

function StatItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function AgentCard({
  name,
  status,
  lastHeartbeat,
  nextHeartbeat,
  todayRuns,
  tokenUsage,
  recentActions,
}: AgentCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>{name}</CardTitle>
        <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5 border-b border-[var(--border)] pb-5">
        <StatItem label="Last Heartbeat" value={lastHeartbeat} />
        <StatItem label="Next Heartbeat" value={nextHeartbeat} />
        <StatItem
          label="Today"
          value={
            <span>
              <span className="text-[var(--ssg-green)]">{todayRuns} runs</span>
              <span className="text-[var(--muted-foreground)] font-normal"> · {tokenUsage}</span>
            </span>
          }
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
          Recent Actions
        </p>
        {recentActions.map((action, index) => (
          <div key={index} className="flex gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="shrink-0 font-mono text-[var(--ssg-green)]">{action.time}</span>
            <span>{action.description}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
