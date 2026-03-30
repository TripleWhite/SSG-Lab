import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HealthStatus = "on-track" | "needs-attention" | "at-risk" | "overdue";
type StageVariant = "default" | "info" | "warning" | "success" | "danger";

const healthConfig: Record<
  HealthStatus,
  { label: string; variant: "success" | "warning" | "danger"; dot: string }
> = {
  "on-track": {
    label: "On Track",
    variant: "success",
    dot: "bg-emerald-400",
  },
  "needs-attention": {
    label: "Needs Attention",
    variant: "warning",
    dot: "bg-amber-400",
  },
  "at-risk": { label: "At Risk", variant: "danger", dot: "bg-red-400" },
  overdue: { label: "Overdue", variant: "danger", dot: "bg-red-600" },
};

export interface ProjectData {
  id: string;
  title: string;
  subtitle: string;
  stage: string;
  stageVariant: StageVariant;
  health: HealthStatus;
  status: string;
  assignee: string;
  daysActive: number;
  lastActivityDate: string;
  latestSignal: string;
  nextAction: string;
  tags: string[];
  totalTasks: number;
  activeTasks: number;
  blockedTasks: number;
  doneTasks: number;
}

interface ProjectCardProps {
  project: ProjectData;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const {
    title,
    subtitle,
    stage,
    stageVariant,
    health,
    assignee,
    daysActive,
    lastActivityDate,
    latestSignal,
    nextAction,
    tags,
  } = project;

  const { label: healthLabel, variant: healthVariant, dot } = healthConfig[health];

  const healthClassName =
    healthVariant === "success"
      ? "bg-emerald-500/10 text-emerald-400"
      : healthVariant === "warning"
      ? "bg-amber-500/10 text-amber-400"
      : "bg-red-500/10 text-red-400";

  return (
    <Card
      className="p-5 transition-all duration-200 hover:border-[var(--ssg-green)]/30 hover:bg-[var(--card-hover)]"
      hover={false}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        {/* Left: Workstream identity */}
        <div className="flex min-w-[180px] flex-col gap-1">
          <p className="text-base font-bold tracking-tight">{title}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant={stageVariant}>{stage}</Badge>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${healthClassName}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              {healthLabel}
            </span>
          </div>
        </div>

        {/* Center: Insights */}
        <div className="flex flex-1 flex-col gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Latest Signal
            </p>
            <p className="mt-0.5 text-sm text-[var(--foreground)]">{latestSignal}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Next Action
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--ssg-green)]">
              {nextAction}
            </p>
          </div>
        </div>

        {/* Right: Meta */}
        <div className="flex flex-row gap-6 sm:flex-col sm:items-end sm:gap-2">
          <div className="text-right">
            <p className="text-xs text-[var(--muted-foreground)]">Assigned to</p>
            <p className="text-sm font-semibold">{assignee}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--muted-foreground)]">Active for</p>
            <p className="text-sm font-medium">{daysActive}d</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--muted-foreground)]">Last activity</p>
            <p className="text-sm font-medium">{lastActivityDate}</p>
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
          {tags.map((tag) => (
            <Badge key={tag} variant="info">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
