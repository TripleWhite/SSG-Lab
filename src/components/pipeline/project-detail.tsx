"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { ProjectData } from "./project-card";

type HealthStatus = "on-track" | "needs-attention" | "at-risk" | "overdue";
type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked"
  | "cancelled";

const healthConfig: Record<
  HealthStatus,
  { label: string; dot: string; className: string }
> = {
  "on-track": {
    label: "On Track",
    dot: "bg-emerald-400",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  "needs-attention": {
    label: "Needs Attention",
    dot: "bg-amber-400",
    className: "bg-amber-500/10 text-amber-400",
  },
  "at-risk": {
    label: "At Risk",
    dot: "bg-red-400",
    className: "bg-red-500/10 text-red-400",
  },
  overdue: {
    label: "Overdue",
    dot: "bg-red-600",
    className: "bg-red-500/10 text-red-400",
  },
};

interface TimelineEntry {
  date: string;
  event: string;
  actor: string;
}

export interface ProjectTaskSummary {
  id: string;
  identifier: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  updatedAtLabel: string;
}

export interface ProjectDetailData extends ProjectData {
  timeline: TimelineEntry[];
  actions: string[];
  tasks: ProjectTaskSummary[];
}

interface ProjectDetailProps {
  project: ProjectDetailData;
  onClose: () => void;
}

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; variant: "default" | "info" | "warning" | "success" | "danger" }
> = {
  backlog: { label: "Backlog", variant: "info" },
  todo: { label: "Todo", variant: "info" },
  in_progress: { label: "In Progress", variant: "success" },
  in_review: { label: "In Review", variant: "warning" },
  done: { label: "Done", variant: "default" },
  blocked: { label: "Blocked", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

export function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const { label: healthLabel, dot, className: healthClassName } = healthConfig[project.health];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-50 w-[480px] animate-slide-in-right overflow-y-auto bg-[var(--card)] border-l border-[var(--border)] shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{project.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{project.subtitle}</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={project.stageVariant}>{project.stage}</Badge>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${healthClassName}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {healthLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              <span className="text-[var(--foreground)] font-medium">Assigned to</span>{" "}
              {project.assignee}
            </p>
          </div>

          {/* Latest Signal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Latest Signal
            </h3>
            <p className="text-sm text-[var(--foreground)] leading-relaxed">
              {project.latestSignal}
            </p>
          </div>

          {/* Recommended Actions */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Recommended Actions
            </h3>
            <ol className="space-y-2">
              {project.actions.map((action, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 text-[var(--ssg-green)] font-semibold">
                    {i + 1}.
                  </span>
                  <span className="text-[var(--foreground)]">{action}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Child Tasks */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Child Tasks
            </h3>
            {project.tasks.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No child tasks are attached to this workstream yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {project.tasks.map((task) => {
                  const config = taskStatusConfig[task.status];

                  return (
                    <li
                      key={task.id}
                      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {task.identifier}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            {task.title}
                          </p>
                        </div>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                        {task.assignee} &middot; {task.updatedAtLabel}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[var(--border)]" />
              <ul className="space-y-4 pl-6">
                {project.timeline.map((entry) => (
                  <li key={`${entry.date}-${entry.event}`} className="relative">
                    <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--ssg-green)] ring-2 ring-[var(--card)]" />
                    <p className="text-sm text-[var(--foreground)]">{entry.event}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {entry.date} &middot; {entry.actor}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
