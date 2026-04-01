import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionBadge } from "@/components/ui/section-badge";

type HeartbeatStatus = "ok" | "slow" | "missed";

const statusVariant: Record<HeartbeatStatus, "success" | "warning" | "danger"> = {
  ok: "success",
  slow: "warning",
  missed: "danger",
};

const statusLabel: Record<HeartbeatStatus, string> = {
  ok: "OK",
  slow: "Slow",
  missed: "Missed",
};

interface HeartbeatEntry {
  time: string;
  agentName: string;
  status: HeartbeatStatus;
  tokens: number;
  summary: string;
}

interface HeartbeatTimelineProps {
  entries: HeartbeatEntry[];
}

function TimelineDot({ status }: { status: HeartbeatStatus }) {
  if (status === "ok") {
    return (
      <span className="absolute -left-[19px] top-1.5 flex h-2.5 w-2.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--card)] ring-offset-0" />
      </span>
    );
  }

  const dotColor = status === "slow" ? "bg-amber-400" : "bg-red-400";

  return (
    <span
      className={`absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full ${dotColor} ring-2 ring-[var(--card)] ring-offset-0`}
    />
  );
}

export function HeartbeatTimeline({ entries }: HeartbeatTimelineProps) {
  return (
    <Card>
      <SectionBadge>Automation</SectionBadge>
      <CardTitle className="mb-5 mt-4">Automation Timeline (Today)</CardTitle>

      <div className="relative">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[var(--border)]" />

        <ul className="space-y-5 pl-6">
          {entries.map((entry, index) => (
            <li key={index} className="relative">
              <TimelineDot status={entry.status} />

              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="font-mono text-xs text-[var(--muted-foreground)]">{entry.time}</span>
                <span className="text-sm font-semibold">{entry.agentName}</span>
                <Badge variant={statusVariant[entry.status]}>{statusLabel[entry.status]}</Badge>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {entry.tokens.toLocaleString()} tokens
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">{entry.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
