"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

type HealthStatus = "on-track" | "needs-attention" | "at-risk" | "overdue";

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

interface RelatedMatch {
  name: string;
  confidence: number;
}

interface ProjectDetailData {
  company: string;
  founder: string;
  stage: string;
  health: HealthStatus;
  assignee: string;
  latestInsight: string;
  timeline: TimelineEntry[];
  actions: string[];
  relatedMatches?: RelatedMatch[];
}

interface ProjectDetailProps {
  project: ProjectDetailData;
  onClose: () => void;
}

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
            <h2 className="text-2xl font-bold tracking-tight">{project.company}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{project.founder}</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="info">{project.stage}</Badge>
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

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[var(--border)]" />
              <ul className="space-y-4 pl-6">
                {project.timeline.map((entry, i) => (
                  <li key={i} className="relative">
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

          {/* Latest Insight */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Latest Insight
            </h3>
            <p className="text-sm text-[var(--foreground)] leading-relaxed">
              {project.latestInsight}
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

          {/* Related Matches */}
          {project.relatedMatches && project.relatedMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                Related Matches
              </h3>
              <ul className="space-y-2">
                {project.relatedMatches.map((match, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  >
                    <span className="text-sm">{match.name}</span>
                    <span className="text-sm font-bold text-[var(--ssg-green)]">
                      {match.confidence}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
