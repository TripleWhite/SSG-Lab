import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MatchType = "supply-demand" | "resource" | "investor" | "talent" | "cross-project" | "mentor";
type MatchStatus = "pending" | "accepted" | "dismissed";

const typeConfig: Record<MatchType, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  "supply-demand": { label: "Supply & Demand", variant: "default" },
  resource: { label: "Resource", variant: "info" },
  investor: { label: "Investor", variant: "warning" },
  talent: { label: "Talent", variant: "success" },
  "cross-project": { label: "Cross-Project", variant: "danger" },
  mentor: { label: "Mentor", variant: "info" },
};

const statusConfig: Record<MatchStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "Pending", variant: "warning" },
  accepted: { label: "Accepted", variant: "success" },
  dismissed: { label: "Dismissed", variant: "danger" },
};

interface MatchSide {
  entityName: string;
  description: string;
  viaEmployee?: string;
}

interface MatchCardProps {
  type: MatchType;
  confidence: number;
  status: MatchStatus;
  timestamp: string;
  sideA: MatchSide;
  sideB: MatchSide;
  suggestion: string;
  onCreateTask?: () => void;
  onDismiss?: () => void;
}

function SideBox({ side }: { side: MatchSide }) {
  return (
    <div className="flex-1 rounded-md border border-[var(--border)] p-3 space-y-1">
      <p className="text-sm font-semibold">{side.entityName}</p>
      <p className="text-xs text-[var(--muted-foreground)]">{side.description}</p>
      {side.viaEmployee && (
        <p className="text-xs text-[var(--ssg-green)]">via {side.viaEmployee}</p>
      )}
    </div>
  );
}

export function MatchCard({
  type,
  confidence,
  status,
  timestamp,
  sideA,
  sideB,
  suggestion,
  onCreateTask,
  onDismiss,
}: MatchCardProps) {
  const { label: typeLabel, variant: typeVariant } = typeConfig[type];
  const { label: statusLabel, variant: statusVariant } = statusConfig[status];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge variant={typeVariant}>{typeLabel}</Badge>
          <span className="text-sm font-bold text-[var(--ssg-green)]">{confidence}% match</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <span className="text-xs text-[var(--muted-foreground)]">{timestamp}</span>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <SideBox side={sideA} />
        <SideBox side={sideB} />
      </div>

      <p className="text-sm text-[var(--muted-foreground)] mb-4">{suggestion}</p>

      {status === "pending" && (onCreateTask || onDismiss) && (
        <div className="flex gap-2">
          {onCreateTask && (
            <Button variant="outline" onClick={onCreateTask}>
              Create Task
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
