import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HealthStatus = "on-track" | "needs-attention" | "at-risk" | "overdue";

const healthConfig: Record<HealthStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  "on-track": { label: "On Track", variant: "success" },
  "needs-attention": { label: "Needs Attention", variant: "warning" },
  "at-risk": { label: "At Risk", variant: "danger" },
  "overdue": { label: "Overdue", variant: "danger" },
};

interface ProjectCardProps {
  company: string;
  founder: string;
  health: HealthStatus;
  assignee: string;
  daysInStage: number;
  tags?: string[];
}

export function ProjectCard({ company, founder, health, assignee, daysInStage, tags }: ProjectCardProps) {
  const { label, variant } = healthConfig[health];

  return (
    <Card className="p-4" hover>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{company}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{founder}</p>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>

      {tags && tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="info">{tag}</Badge>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{assignee}</span>
        <span>{daysInStage}d in stage</span>
      </div>
    </Card>
  );
}
