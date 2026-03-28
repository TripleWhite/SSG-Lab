"use client";

import { useState, useMemo, useCallback } from "react";
import { Header } from "@/components/nav/header";
import { ProjectCard, type ProjectData } from "@/components/pipeline/project-card";
import { ProjectDetail } from "@/components/pipeline/project-detail";

interface TimelineEntry {
  date: string;
  event: string;
  actor: string;
}

interface RelatedMatch {
  name: string;
  confidence: number;
}

interface EnrichedProjectData extends ProjectData {
  timeline: TimelineEntry[];
  actions: string[];
  relatedMatches?: RelatedMatch[];
}

const ALL_PROJECTS: EnrichedProjectData[] = [
  {
    id: "ic-1",
    company: "\u661f\u9645\u79d1\u6280",
    founder: "\u738b\u6d69\u7136",
    stage: "Initial Contact",
    health: "on-track",
    assignee: "Arthur",
    daysSinceContact: 5,
    lastActivityDate: "Mar 27",
    latestInsight: "Founder has strong enterprise sales background; product in closed beta with 3 Fortune 500 pilots.",
    nextAction: "Schedule technical deep-dive with CTO",
    tags: ["AI", "B2B", "Enterprise SaaS"],
    timeline: [
      { date: "2026-03-22", event: "Inbound referral from LP network", actor: "Arthur" },
      { date: "2026-03-24", event: "Initial screening call with founder", actor: "Arthur" },
      { date: "2026-03-27", event: "Received pitch deck and product demo link", actor: "Arthur" },
    ],
    actions: [
      "Schedule technical deep-dive with CTO to assess AI model architecture",
      "Request customer reference from one of the Fortune 500 pilot accounts",
      "Run competitive landscape analysis against incumbent enterprise tools",
    ],
    relatedMatches: [
      { name: "\u661f\u9645\u79d1\u6280 \u2194 BigCorp", confidence: 88 },
    ],
  },
  {
    id: "ic-2",
    company: "\u4e91\u7aef\u533b\u7597",
    founder: "\u674e\u6653\u6885",
    stage: "Initial Contact",
    health: "needs-attention",
    assignee: "Sarah",
    daysSinceContact: 12,
    lastActivityDate: "Mar 21",
    latestInsight: "Promising remote diagnostics use case but regulatory path for Class II device is unclear.",
    nextAction: "Follow up on NMPA pre-submission consultation status",
    tags: ["HealthTech", "MedDevice"],
    timeline: [
      { date: "2026-03-10", event: "Sourcing agent flagged from conference attendee list", actor: "Sourcing Agent" },
      { date: "2026-03-15", event: "Intro call with founder \u2014 discussed product roadmap", actor: "Sarah" },
      { date: "2026-03-21", event: "Follow-up email sent regarding NMPA timeline", actor: "Sarah" },
    ],
    actions: [
      "Follow up on NMPA pre-submission consultation status \u2014 12 days without response",
      "Connect founder with HealthBridge portfolio company for regulatory guidance",
    ],
  },
  {
    id: "ic-3",
    company: "\u7eff\u80fd\u667a\u6167",
    founder: "\u9648\u5fd7\u8fdc",
    stage: "Initial Contact",
    health: "overdue",
    assignee: "Michael",
    daysSinceContact: 21,
    lastActivityDate: "Mar 8",
    latestInsight: "Solid IoT hardware prototype, but founder has not responded to two follow-up emails this week.",
    nextAction: "Final outreach attempt \u2014 archive if no response by Mar 31",
    tags: ["CleanTech", "IoT", "Hardware"],
    timeline: [
      { date: "2026-03-01", event: "Initial meeting at CleanTech Expo", actor: "Michael" },
      { date: "2026-03-05", event: "Follow-up email with term overview sent", actor: "Michael" },
      { date: "2026-03-08", event: "Second follow-up \u2014 no response", actor: "Michael" },
      { date: "2026-03-15", event: "Third follow-up attempt \u2014 still no response", actor: "Michael" },
    ],
    actions: [
      "Send final outreach with clear deadline of Mar 31",
      "Archive project if no response received by deadline",
    ],
  },
  {
    id: "dd-1",
    company: "\u6570\u5b57\u7269\u6d41",
    founder: "\u5f20\u601d\u7426",
    stage: "Due Diligence",
    health: "on-track",
    assignee: "Michael",
    daysSinceContact: 38,
    lastActivityDate: "Mar 28",
    latestInsight: "Revenue growing 22% MoM; unit economics confirmed positive at scale with GP margin at 41%.",
    nextAction: "Complete reference calls with top 3 customers",
    tags: ["Logistics", "SaaS", "B2B"],
    timeline: [
      { date: "2026-02-20", event: "Initial screening passed \u2014 moved to DD", actor: "Michael" },
      { date: "2026-03-05", event: "Financial model review completed", actor: "Sarah" },
      { date: "2026-03-18", event: "Technical architecture assessment by CTO", actor: "Arthur" },
      { date: "2026-03-28", event: "Customer reference call #1 completed (positive)", actor: "Michael" },
    ],
    actions: [
      "Complete remaining 2 customer reference calls this week",
      "Request updated financial projections for Q2-Q4 2026",
      "Prepare DD summary memo for investment committee",
    ],
    relatedMatches: [
      { name: "\u6570\u5b57\u7269\u6d41 \u2194 LogiFlow", confidence: 76 },
    ],
  },
  {
    id: "dd-2",
    company: "\u667a\u94fe\u91d1\u878d",
    founder: "\u5218\u5efa\u56fd",
    stage: "Due Diligence",
    health: "at-risk",
    assignee: "Sarah",
    daysSinceContact: 45,
    lastActivityDate: "Mar 24",
    latestInsight: "Cap table has complex ESOP overhang; co-founder equity dispute surfaced during legal review.",
    nextAction: "Request resolution plan and updated cap table from founder",
    tags: ["FinTech", "B2B"],
    timeline: [
      { date: "2026-02-12", event: "Entered due diligence after strong IC screening", actor: "Sarah" },
      { date: "2026-03-01", event: "Legal review initiated \u2014 cap table complexity flagged", actor: "Legal Team" },
      { date: "2026-03-15", event: "Co-founder equity dispute discovered", actor: "Sarah" },
      { date: "2026-03-24", event: "Meeting with founder to discuss cap table resolution", actor: "Sarah" },
    ],
    actions: [
      "Request formal resolution plan for co-founder equity dispute within 2 weeks",
      "Obtain updated and clean cap table before proceeding",
    ],
  },
  {
    id: "id-1",
    company: "\u6167\u773c\u89c6\u89c9",
    founder: "\u5434\u96c5\u9759",
    stage: "Investment Decision",
    health: "on-track",
    assignee: "Arthur",
    daysSinceContact: 62,
    lastActivityDate: "Mar 29",
    latestInsight: "IC approved term sheet last Thursday; founder accepted preliminary terms \u2014 awaiting legal sign-off.",
    nextAction: "Finalize investment agreement with legal team",
    tags: ["Computer Vision", "AI", "Deep Tech"],
    timeline: [
      { date: "2026-01-28", event: "Initial contact via warm intro", actor: "Arthur" },
      { date: "2026-02-15", event: "Due diligence completed \u2014 strong pass", actor: "Michael" },
      { date: "2026-03-20", event: "IC meeting \u2014 term sheet approved", actor: "Arthur" },
      { date: "2026-03-25", event: "Founder accepted preliminary terms", actor: "Arthur" },
      { date: "2026-03-29", event: "Legal review of investment agreement in progress", actor: "Legal Team" },
    ],
    actions: [
      "Finalize investment agreement with legal team by end of week",
      "Prepare board seat nomination and governance documents",
      "Draft post-investment 90-day support plan",
    ],
    relatedMatches: [
      { name: "\u6167\u773c\u89c6\u89c9 \u2194 Acme Ventures", confidence: 91 },
      { name: "\u6167\u773c\u89c6\u89c9 \u2194 DesignAI", confidence: 84 },
    ],
  },
  {
    id: "ac-1",
    company: "\u805a\u5408\u6559\u80b2",
    founder: "\u8d75\u660e\u5b87",
    stage: "Acceleration",
    health: "on-track",
    assignee: "Michael",
    daysSinceContact: 112,
    lastActivityDate: "Mar 28",
    latestInsight: "ARR crossed \u00a53M milestone ahead of schedule; enterprise pilot with \u65b0\u4e1c\u65b9 converting to full contract.",
    nextAction: "Intro to Series A lead investor \u2014 deck review this Friday",
    tags: ["EdTech", "SaaS", "B2B2C"],
    timeline: [
      { date: "2025-12-05", event: "Investment closed \u2014 entered acceleration program", actor: "Michael" },
      { date: "2026-02-10", event: "Quarterly review \u2014 on track for milestones", actor: "Michael" },
      { date: "2026-03-15", event: "\u65b0\u4e1c\u65b9 pilot conversion confirmed", actor: "\u8d75\u660e\u5b87" },
      { date: "2026-03-28", event: "Series A prep meeting \u2014 deck draft reviewed", actor: "Michael" },
    ],
    actions: [
      "Introduce to 3 Series A lead investors from LP network",
      "Review and finalize fundraising deck by Friday",
      "Connect with enterprise sales mentor for pipeline scaling",
    ],
    relatedMatches: [
      { name: "\u805a\u5408\u6559\u80b2 \u2194 EduTech", confidence: 79 },
    ],
  },
  {
    id: "ac-2",
    company: "\u78b3\u7d22\u80fd\u6e90",
    founder: "\u5b59\u4e3d\u534e",
    stage: "Acceleration",
    health: "needs-attention",
    assignee: "Sarah",
    daysSinceContact: 98,
    lastActivityDate: "Mar 20",
    latestInsight: "Two key engineers resigned last month; hiring progress is stalled and Q1 product milestones slipping.",
    nextAction: "Connect with engineering recruitment partner for emergency placements",
    tags: ["CleanTech", "Energy", "Deep Tech"],
    timeline: [
      { date: "2025-12-20", event: "Investment closed \u2014 acceleration started", actor: "Sarah" },
      { date: "2026-02-15", event: "Two senior engineers resigned", actor: "\u5b59\u4e3d\u534e" },
      { date: "2026-03-01", event: "Emergency hiring plan initiated", actor: "Sarah" },
      { date: "2026-03-20", event: "Status check \u2014 hiring still stalled, milestones slipping", actor: "Sarah" },
    ],
    actions: [
      "Urgently connect with 2-3 engineering recruitment partners",
      "Explore contractor bridge for critical Q2 deliverables",
      "Schedule weekly check-ins until engineering team is restaffed",
    ],
  },
  {
    id: "ic-4",
    company: "\u77b0\u4e91\u51fa\u884c",
    founder: "\u5468\u5929\u7fd4",
    stage: "Initial Contact",
    health: "at-risk",
    assignee: "Arthur",
    daysSinceContact: 9,
    lastActivityDate: "Mar 22",
    latestInsight: "Market entry timing aggressive \u2014 three well-funded competitors launched in the same vertical last quarter.",
    nextAction: "Request differentiation memo before proceeding to DD",
    tags: ["Mobility", "AI", "Consumer"],
    timeline: [
      { date: "2026-03-18", event: "Inbound via AngelList application", actor: "Sourcing Agent" },
      { date: "2026-03-20", event: "Initial screening call \u2014 competitive landscape concern raised", actor: "Arthur" },
      { date: "2026-03-22", event: "Requested differentiation memo from founder", actor: "Arthur" },
    ],
    actions: [
      "Await differentiation memo \u2014 deadline Mar 31",
      "Run competitive analysis on 3 recently funded competitors",
    ],
  },
  {
    id: "ex-1",
    company: "\u878d\u5408\u7f51\u7edc",
    founder: "\u90d1\u6668\u5149",
    stage: "Exit",
    health: "on-track",
    assignee: "Michael",
    daysSinceContact: 480,
    lastActivityDate: "Mar 26",
    latestInsight: "Acquisition by \u4e2d\u5174\u901a\u8baf closed successfully at 4.2x return; post-merger integration on schedule.",
    nextAction: "Prepare portfolio update and LP distribution notice",
    tags: ["Networking", "B2B", "Infrastructure"],
    timeline: [
      { date: "2024-11-15", event: "Initial investment made", actor: "Arthur" },
      { date: "2025-08-20", event: "Series A follow-on investment", actor: "Michael" },
      { date: "2026-02-01", event: "\u4e2d\u5174\u901a\u8baf acquisition offer received", actor: "\u90d1\u6668\u5149" },
      { date: "2026-03-10", event: "Acquisition closed at 4.2x return", actor: "Legal Team" },
      { date: "2026-03-26", event: "Post-merger integration kickoff meeting", actor: "Michael" },
    ],
    actions: [
      "Prepare LP distribution notice and portfolio performance update",
      "Document lessons learned for future exit playbook",
    ],
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      ALL_PROJECTS.filter(
        (p) => matchesTab(p, activeTab) && matchesSearch(p, search)
      ),
    [activeTab, search]
  );

  const filteredStats = useMemo(
    () => ({
      total: filtered.length,
      active: filtered.filter(isActive).length,
      needsAttention: filtered.filter((p) => p.health === "needs-attention").length,
      overdue: filtered.filter((p) => p.health === "overdue").length,
    }),
    [filtered]
  );

  const selectedProject = useMemo(
    () => (selectedProjectId ? ALL_PROJECTS.find((p) => p.id === selectedProjectId) ?? null : null),
    [selectedProjectId]
  );

  const handleClose = useCallback(() => setSelectedProjectId(null), []);

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
          placeholder="Search by name, founder, or tag\u2026"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--ssg-green)]/50 focus:ring-1 focus:ring-[var(--ssg-green)]/30 sm:w-64"
        />
      </div>

      {/* Stats bar */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-3">
        <StatItem label="Total" value={filteredStats.total} />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Active" value={filteredStats.active} />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Needs Attention" value={filteredStats.needsAttention} color="text-amber-400" />
        <span className="hidden border-l border-[var(--border)] sm:block" />
        <StatItem label="Overdue" value={filteredStats.overdue} color="text-red-400" />
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--muted-foreground)]">
          No projects match your filter.
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

      {/* Detail panel */}
      {selectedProject && (
        <ProjectDetail project={selectedProject} onClose={handleClose} />
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
