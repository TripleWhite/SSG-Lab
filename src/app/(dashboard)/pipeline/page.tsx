"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/nav/header";
import { ProjectCard, type ProjectData } from "@/components/pipeline/project-card";

const ALL_PROJECTS: ProjectData[] = [
  {
    id: "ic-1",
    company: "星际科技",
    founder: "王浩然",
    stage: "Initial Contact",
    health: "on-track",
    assignee: "Arthur",
    daysSinceContact: 5,
    lastActivityDate: "Mar 27",
    latestInsight: "Founder has strong enterprise sales background; product in closed beta with 3 Fortune 500 pilots.",
    nextAction: "Schedule technical deep-dive with CTO",
    tags: ["AI", "B2B", "Enterprise SaaS"],
  },
  {
    id: "ic-2",
    company: "云端医疗",
    founder: "李晓梅",
    stage: "Initial Contact",
    health: "needs-attention",
    assignee: "Sarah",
    daysSinceContact: 12,
    lastActivityDate: "Mar 21",
    latestInsight: "Promising remote diagnostics use case but regulatory path for Class II device is unclear.",
    nextAction: "Follow up on NMPA pre-submission consultation status",
    tags: ["HealthTech", "MedDevice"],
  },
  {
    id: "ic-3",
    company: "绿能智慧",
    founder: "陈志远",
    stage: "Initial Contact",
    health: "overdue",
    assignee: "Michael",
    daysSinceContact: 21,
    lastActivityDate: "Mar 8",
    latestInsight: "Solid IoT hardware prototype, but founder has not responded to two follow-up emails this week.",
    nextAction: "Final outreach attempt — archive if no response by Mar 31",
    tags: ["CleanTech", "IoT", "Hardware"],
  },
  {
    id: "dd-1",
    company: "数字物流",
    founder: "张思琪",
    stage: "Due Diligence",
    health: "on-track",
    assignee: "Michael",
    daysSinceContact: 38,
    lastActivityDate: "Mar 28",
    latestInsight: "Revenue growing 22% MoM; unit economics confirmed positive at scale with GP margin at 41%.",
    nextAction: "Complete reference calls with top 3 customers",
    tags: ["Logistics", "SaaS", "B2B"],
  },
  {
    id: "dd-2",
    company: "智链金融",
    founder: "刘建国",
    stage: "Due Diligence",
    health: "at-risk",
    assignee: "Sarah",
    daysSinceContact: 45,
    lastActivityDate: "Mar 24",
    latestInsight: "Cap table has complex ESOP overhang; co-founder equity dispute surfaced during legal review.",
    nextAction: "Request resolution plan and updated cap table from founder",
    tags: ["FinTech", "B2B"],
  },
  {
    id: "id-1",
    company: "慧眼视觉",
    founder: "吴雅静",
    stage: "Investment Decision",
    health: "on-track",
    assignee: "Arthur",
    daysSinceContact: 62,
    lastActivityDate: "Mar 29",
    latestInsight: "IC approved term sheet last Thursday; founder accepted preliminary terms — awaiting legal sign-off.",
    nextAction: "Finalize investment agreement with legal team",
    tags: ["Computer Vision", "AI", "Deep Tech"],
  },
  {
    id: "ac-1",
    company: "聚合教育",
    founder: "赵明宇",
    stage: "Acceleration",
    health: "on-track",
    assignee: "Michael",
    daysSinceContact: 112,
    lastActivityDate: "Mar 28",
    latestInsight: "ARR crossed ¥3M milestone ahead of schedule; enterprise pilot with 新东方 converting to full contract.",
    nextAction: "Intro to Series A lead investor — deck review this Friday",
    tags: ["EdTech", "SaaS", "B2B2C"],
  },
  {
    id: "ac-2",
    company: "碳索能源",
    founder: "孙丽华",
    stage: "Acceleration",
    health: "needs-attention",
    assignee: "Sarah",
    daysSinceContact: 98,
    lastActivityDate: "Mar 20",
    latestInsight: "Two key engineers resigned last month; hiring progress is stalled and Q1 product milestones slipping.",
    nextAction: "Connect with engineering recruitment partner for emergency placements",
    tags: ["CleanTech", "Energy", "Deep Tech"],
  },
  {
    id: "ic-4",
    company: "瞰云出行",
    founder: "周天翔",
    stage: "Initial Contact",
    health: "at-risk",
    assignee: "Arthur",
    daysSinceContact: 9,
    lastActivityDate: "Mar 22",
    latestInsight: "Market entry timing aggressive — three well-funded competitors launched in the same vertical last quarter.",
    nextAction: "Request differentiation memo before proceeding to DD",
    tags: ["Mobility", "AI", "Consumer"],
  },
  {
    id: "ex-1",
    company: "融合网络",
    founder: "郑晨光",
    stage: "Exit",
    health: "on-track",
    assignee: "Michael",
    daysSinceContact: 480,
    lastActivityDate: "Mar 26",
    latestInsight: "Acquisition by 中兴通讯 closed successfully at 4.2x return; post-merger integration on schedule.",
    nextAction: "Prepare portfolio update and LP distribution notice",
    tags: ["Networking", "B2B", "Infrastructure"],
  },
];

type FilterTab = "all" | "active" | "needs-attention" | "overdue";

const ACTIVE_HEALTH = new Set(["on-track", "needs-attention", "at-risk"]);

function isActive(project: ProjectData): boolean {
  return ACTIVE_HEALTH.has(project.health) && project.stage !== "Exit";
}

function matchesTab(project: ProjectData, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "active") return isActive(project);
  if (tab === "needs-attention") return project.health === "needs-attention";
  if (tab === "overdue") return project.health === "overdue";
  return true;
}

function matchesSearch(project: ProjectData, query: string): boolean {
  if (!query.trim()) return true;
  const lower = query.toLowerCase();
  return (
    project.company.toLowerCase().includes(lower) ||
    project.founder.toLowerCase().includes(lower) ||
    project.assignee.toLowerCase().includes(lower) ||
    project.tags.some((t) => t.toLowerCase().includes(lower))
  );
}

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  active: "Active",
  "needs-attention": "Needs Attention",
  overdue: "Overdue",
};

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(
    () => ({
      total: ALL_PROJECTS.length,
      active: ALL_PROJECTS.filter(isActive).length,
      needsAttention: ALL_PROJECTS.filter((p) => p.health === "needs-attention").length,
      overdue: ALL_PROJECTS.filter((p) => p.health === "overdue").length,
    }),
    []
  );

  const filtered = useMemo(
    () =>
      ALL_PROJECTS.filter(
        (p) => matchesTab(p, activeTab) && matchesSearch(p, search)
      ),
    [activeTab, search]
  );

  return (
    <div>
      <Header title="Projects" description="All portfolio projects and pipeline" />

      {/* Filter bar */}
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
          placeholder="Search by name, founder, or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--ssg-green)]/50 focus:ring-1 focus:ring-[var(--ssg-green)]/30 sm:w-64"
        />
      </div>

      {/* Stats bar */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-3">
        <StatItem label="Total" value={stats.total} />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Active" value={stats.active} />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Needs Attention" value={stats.needsAttention} color="text-amber-400" />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Overdue" value={stats.overdue} color="text-red-400" />
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--muted-foreground)]">
          No projects match your filter.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
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
