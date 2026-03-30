"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/pipeline/project-card";
import { ProjectDetail, type ProjectDetailData } from "@/components/pipeline/project-detail";

type FilterTab = "all" | "active" | "needs-attention" | "blocked";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  active: "Active",
  "needs-attention": "Needs Attention",
  blocked: "Blocked",
};

function isActive(project: ProjectDetailData): boolean {
  return project.status !== "done" && project.status !== "cancelled";
}

function matchesTab(project: ProjectDetailData, tab: FilterTab): boolean {
  if (tab === "all") {
    return true;
  }
  if (tab === "active") {
    return isActive(project);
  }
  if (tab === "needs-attention") {
    return project.health !== "on-track";
  }
  return project.status === "blocked" || project.blockedTasks > 0;
}

function matchesSearch(project: ProjectDetailData, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const lower = query.toLowerCase();
  return (
    project.title.toLowerCase().includes(lower) ||
    project.subtitle.toLowerCase().includes(lower) ||
    project.assignee.toLowerCase().includes(lower) ||
    project.tags.some((tag) => tag.toLowerCase().includes(lower))
  );
}

function StatItem({
  label,
  value,
  color = "text-[var(--foreground)]",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

interface PipelineBoardProps {
  projects: ProjectDetailData[];
}

export function PipelineBoard({ projects }: PipelineBoardProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const filtered = projects.filter(
    (project) => matchesTab(project, activeTab) && matchesSearch(project, search)
  );

  const filteredStats = {
    total: filtered.length,
    active: filtered.filter(isActive).length,
    needsAttention: filtered.filter((project) => project.health !== "on-track").length,
    blocked: filtered.filter(
      (project) => project.status === "blocked" || project.blockedTasks > 0
    ).length,
  };

  const selectedProject =
    selectedProjectId !== null
      ? filtered.find((project) => project.id === selectedProjectId) ??
        projects.find((project) => project.id === selectedProjectId) ??
        null
      : null;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {(Object.keys(TAB_LABELS) as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[var(--ssg-green)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by workstream, owner, or tag…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--ssg-green)]/50 focus:ring-1 focus:ring-[var(--ssg-green)]/30 sm:w-72"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-3">
        <StatItem label="Total" value={filteredStats.total} />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Active" value={filteredStats.active} />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem
          label="Needs Attention"
          value={filteredStats.needsAttention}
          color="text-amber-400"
        />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Blocked" value={filteredStats.blocked} color="text-red-400" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--muted-foreground)]">
          No workstreams match the current filter.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedProjectId(project.id)}
            >
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      )}

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </>
  );
}
