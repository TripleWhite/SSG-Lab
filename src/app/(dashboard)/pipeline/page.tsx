import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Header } from "@/components/nav/header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { ProjectDetailData } from "@/components/pipeline/project-detail";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateLabel, formatRelativeTime, truncateText } from "@/lib/format";
import { getProjectWorkItems, getProjects } from "@/lib/paperclip";
import type { WorkItem } from "@/lib/types";

export const revalidate = 30;

type HealthStatus = ProjectDetailData["health"];
type StageVariant = ProjectDetailData["stageVariant"];

const DAY_MS = 86_400_000;

function toDisplayIdentifier(identifier: string): string {
  return identifier.replace(/^MIM-/, "SSG-");
}

const STATUS_LABELS: Record<WorkItem["status"], string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<WorkItem["status"], StageVariant> = {
  backlog: "info",
  todo: "info",
  in_progress: "success",
  in_review: "warning",
  done: "default",
  blocked: "danger",
  cancelled: "danger",
};

const FALLBACK_WORKSTREAMS: ProjectDetailData[] = [
  {
    id: "phase-1",
    title: "Data Pipeline",
    subtitle: "SSG-307 · Phase 1",
    stage: "In Progress",
    stageVariant: "success",
    health: "at-risk",
    status: "in_progress",
    assignee: "CTO",
    daysActive: 1,
    lastActivityDate: "22m ago",
    latestSignal: "1 blocked infra work item, 2 queued follow-ups, and 1 cancelled backend branch. Progress is waiting on upstream credentials.",
    nextAction: "Resolve the EC2-B and Feishu blockers before verification work can start.",
    tags: ["EC2-B", "Feishu", "1 blocked", "2 queued"],
    totalTasks: 4,
    activeTasks: 0,
    blockedTasks: 1,
    doneTasks: 0,
    timeline: [
      { date: "Mar 28", event: "SSG-307 workstream started", actor: "CTO" },
      { date: "Mar 28", event: "SSG-312 updated · Blocked", actor: "Release Engineer" },
      { date: "Mar 28", event: "SSG-315 queued for review", actor: "Security Reviewer" },
    ],
    actions: [
      "Resolve the EC2-B deployment blocker before downstream verification can begin.",
      "Re-sequence the queued review and docs work items once infra is reachable.",
      "Keep the cancelled SSG Lab server branch out of the active rollout path.",
    ],
    tasks: [
      {
        id: "phase-1-task-1",
        identifier: "SSG-312",
        title: "Provision EC2-B + Deploy control plane + OpenClaw + Caddy + Feishu",
        status: "blocked",
        assignee: "Release Engineer",
        updatedAtLabel: "22m ago",
      },
      {
        id: "phase-1-task-2",
        identifier: "SSG-314",
        title: "Phase 1 E2E Verification — Feishu → SSG Lab pipeline",
        status: "backlog",
        assignee: "QA Engineer",
        updatedAtLabel: "1d ago",
      },
    ],
  },
  {
    id: "phase-2",
    title: "Sourcing Automation",
    subtitle: "SSG-308 · Phase 2",
    stage: "Blocked",
    stageVariant: "danger",
    health: "at-risk",
    status: "blocked",
    assignee: "CTO",
    daysActive: 0,
    lastActivityDate: "4h ago",
    latestSignal: "This workstream is still blocked behind Phase 1 system readiness and has no linked work items started yet.",
    nextAction: "Wait for the shared infrastructure dependencies to clear before opening implementation work items.",
    tags: ["parallel search", "7 platforms", "blocked"],
    totalTasks: 0,
    activeTasks: 0,
    blockedTasks: 0,
    doneTasks: 0,
    timeline: [
      { date: "Mar 29", event: "SSG-308 status set to Blocked", actor: "CTO" },
    ],
    actions: [
      "Keep this workstream parked until the shared platform and Feishu dependencies are live.",
      "Do not create downstream sourcing work items before the infra dependency is removed.",
    ],
    tasks: [],
  },
  {
    id: "phase-3",
    title: "Matching Automation",
    subtitle: "SSG-309 · Phase 3",
    stage: "Blocked",
    stageVariant: "danger",
    health: "at-risk",
    status: "blocked",
    assignee: "CTO",
    daysActive: 0,
    lastActivityDate: "5h ago",
    latestSignal: "Matching remains blocked on the same live data and notification plumbing required by the sourcing and portfolio phases.",
    nextAction: "Keep the workstream dormant until the control-plane and memory prerequisites are complete.",
    tags: ["matching", "notifications", "blocked"],
    totalTasks: 0,
    activeTasks: 0,
    blockedTasks: 0,
    doneTasks: 0,
    timeline: [
      { date: "Mar 28", event: "SSG-309 status set to Blocked", actor: "CTO" },
    ],
    actions: [
      "Wait on the upstream data plane before opening matching implementation work items.",
      "Preserve this workstream as a dependency marker, not an active build branch.",
    ],
    tasks: [],
  },
  {
    id: "phase-4",
    title: "Portfolio Automation",
    subtitle: "SSG-310 · Phase 4",
    stage: "Blocked",
    stageVariant: "danger",
    health: "at-risk",
    status: "blocked",
    assignee: "CTO",
    daysActive: 0,
    lastActivityDate: "5h ago",
    latestSignal: "Portfolio automation is still waiting on the same upstream delivery chain and has not opened its daily-scan work items yet.",
    nextAction: "Hold until the platform dependencies move out of blocked status.",
    tags: ["daily scans", "digests", "blocked"],
    totalTasks: 0,
    activeTasks: 0,
    blockedTasks: 0,
    doneTasks: 0,
    timeline: [
      { date: "Mar 28", event: "SSG-310 status set to Blocked", actor: "CTO" },
    ],
    actions: [
      "Keep the workstream blocked until the shared integrations are available.",
      "Open the daily-digest work items only after the upstream automations can write live data.",
    ],
    tasks: [],
  },
  {
    id: "phase-5",
    title: "Dashboard Integration",
    subtitle: "SSG-311 · Phase 5",
    stage: "In Progress",
    stageVariant: "success",
    health: "on-track",
    status: "in_progress",
    assignee: "CTO",
    daysActive: 0,
    lastActivityDate: "Just now",
    latestSignal: "1 work item is active and 4 downstream review or QA work items are queued. The live data layer is partially shipped and the remaining work is concentrated in the pipeline, matching, and sourcing routes.",
    nextAction: "Finish the remaining live route conversions and hand the branch to review.",
    tags: ["live data", "polling", "1 active", "4 queued"],
    totalTasks: 5,
    activeTasks: 1,
    blockedTasks: 0,
    doneTasks: 0,
    timeline: [
      { date: "Mar 29", event: "SSG-311 workstream started", actor: "CTO" },
      { date: "Mar 29", event: "SSG-318 updated · In Progress", actor: "Frontend Engineer" },
      { date: "Mar 29", event: "SSG-319 queued for code review", actor: "Security Reviewer" },
    ],
    actions: [
      "Finish the remaining live route conversions on SSG-318.",
      "Queue SSG-319 once the implementation branch is stable.",
      "Keep QA and design review work items gated behind the live data merge.",
    ],
    tasks: [
      {
        id: "phase-5-task-1",
        identifier: "SSG-318",
        title: "Implement Phase 5 Dashboard Integration — API clients, live data, polling",
        status: "in_progress",
        assignee: "Frontend Engineer",
        updatedAtLabel: "Just now",
      },
      {
        id: "phase-5-task-2",
        identifier: "SSG-319",
        title: "Review Phase 5 Dashboard Integration code",
        status: "backlog",
        assignee: "Security Reviewer",
        updatedAtLabel: "5h ago",
      },
    ],
  },
];

interface PhaseMeta {
  phaseLabel: string;
  phaseNumber: number;
  shortTitle: string;
  topicTags: string[];
}

function getPhaseMeta(title: string): PhaseMeta {
  const [phaseSegment, detailSegment = ""] = title.split("—");
  const phaseMatch = phaseSegment.trim().match(/^(Phase\s+(\d+)):\s*(.+)$/);

  if (!phaseMatch) {
    return {
      phaseLabel: "Workstream",
      phaseNumber: Number.MAX_SAFE_INTEGER,
      shortTitle: phaseSegment.trim(),
      topicTags: detailSegment
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
  }

  return {
    phaseLabel: phaseMatch[1],
    phaseNumber: Number(phaseMatch[2]),
    shortTitle: phaseMatch[3].trim(),
    topicTags: detailSegment
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

function getChildrenByParent(items: WorkItem[]): Map<string, WorkItem[]> {
  const childrenByParent = new Map<string, WorkItem[]>();

  for (const item of items) {
    if (!item.parentId) {
      continue;
    }

    const current = childrenByParent.get(item.parentId) ?? [];
    current.push(item);
    childrenByParent.set(item.parentId, current);
  }

  return childrenByParent;
}

function collectDescendants(
  parentId: string,
  childrenByParent: Map<string, WorkItem[]>
): WorkItem[] {
  const descendants: WorkItem[] = [];
  const stack = [...(childrenByParent.get(parentId) ?? [])];

  while (stack.length > 0) {
    const current = stack.shift();

    if (!current) {
      continue;
    }

    descendants.push(current);
    stack.push(...(childrenByParent.get(current.id) ?? []));
  }

  return descendants;
}

function getDaysActive(value: string | undefined): number {
  return Math.max(0, Math.floor((Date.now() - new Date(value ?? Date.now()).getTime()) / DAY_MS));
}

function getLatestTimestamp(workstream: WorkItem, descendants: WorkItem[]): string {
  return descendants.reduce((latest, item) => {
    return new Date(item.updatedAt).getTime() > new Date(latest).getTime()
      ? item.updatedAt
      : latest;
  }, workstream.updatedAt);
}

function getHealth(workstream: WorkItem, descendants: WorkItem[]): HealthStatus {
  const lastActivityAt = getLatestTimestamp(workstream, descendants);
  const lastActivityAgeDays = getDaysActive(lastActivityAt);
  const activeTasks = descendants.filter((item) => item.status === "in_progress").length;
  const blockedTasks = descendants.filter((item) => item.status === "blocked").length;
  const openTasks = descendants.filter(
    (item) => item.status !== "done" && item.status !== "cancelled"
  ).length;

  if (workstream.status === "blocked") {
    return lastActivityAgeDays >= 2 ? "overdue" : "at-risk";
  }

  if (blockedTasks > 0) {
    return activeTasks > 0 ? "needs-attention" : "at-risk";
  }

  if (openTasks === 0) {
    return "on-track";
  }

  if (activeTasks === 0) {
    return lastActivityAgeDays >= 2 ? "overdue" : "needs-attention";
  }

  if (lastActivityAgeDays >= 3) {
    return "needs-attention";
  }

  return "on-track";
}

function buildLatestSignal(workstream: WorkItem, descendants: WorkItem[]): string {
  if (descendants.length === 0) {
    return `${toDisplayIdentifier(workstream.identifier)} is ${STATUS_LABELS[workstream.status].toLowerCase()} with no linked work items started yet.`;
  }

  const activeTasks = descendants.filter((item) => item.status === "in_progress").length;
  const queuedTasks = descendants.filter((item) =>
    item.status === "backlog" || item.status === "todo" || item.status === "in_review"
  ).length;
  const blockedTasks = descendants.filter((item) => item.status === "blocked").length;
  const doneTasks = descendants.filter((item) => item.status === "done").length;
  const parts: string[] = [];

  if (activeTasks > 0) {
    parts.push(`${activeTasks} active`);
  }
  if (queuedTasks > 0) {
    parts.push(`${queuedTasks} queued`);
  }
  if (blockedTasks > 0) {
    parts.push(`${blockedTasks} blocked`);
  }
  if (doneTasks > 0) {
    parts.push(`${doneTasks} done`);
  }

  return `${parts.join(", ")}. Last movement ${formatRelativeTime(
    getLatestTimestamp(workstream, descendants)
  )}.`;
}

function buildNextAction(workstream: WorkItem, descendants: WorkItem[]): string {
  const blockedTask = descendants.find((item) => item.status === "blocked");
  if (blockedTask) {
    return `Resolve ${toDisplayIdentifier(blockedTask.identifier)} before downstream work can move.`;
  }

  const activeTask = descendants.find((item) => item.status === "in_progress");
  if (activeTask) {
    return `Advance ${toDisplayIdentifier(activeTask.identifier)} through implementation and verification.`;
  }

  const reviewTask = descendants.find((item) => item.status === "in_review");
  if (reviewTask) {
    return `Close review on ${toDisplayIdentifier(reviewTask.identifier)}.`;
  }

  const queuedTask = descendants.find(
    (item) => item.status === "backlog" || item.status === "todo"
  );
  if (queuedTask) {
    return `Start ${toDisplayIdentifier(queuedTask.identifier)} when dependencies are clear.`;
  }

  if (workstream.status === "blocked") {
    return `Unblock ${toDisplayIdentifier(workstream.identifier)} before execution can resume.`;
  }

  return `Monitor ${toDisplayIdentifier(workstream.identifier)} for the next assignment change.`;
}

function buildActions(workstream: WorkItem, descendants: WorkItem[]): string[] {
  const actions: string[] = [];
  const blockedTask = descendants.find((item) => item.status === "blocked");
  const activeTask = descendants.find((item) => item.status === "in_progress");
  const reviewTask = descendants.find((item) => item.status === "in_review");
  const queuedTask = descendants.find(
    (item) => item.status === "backlog" || item.status === "todo"
  );

  if (blockedTask) {
    actions.push(
      `Resolve blocker on ${toDisplayIdentifier(blockedTask.identifier)}: ${truncateText(blockedTask.title, 72)}`
    );
  }
  if (activeTask) {
    actions.push(
      `Advance ${toDisplayIdentifier(activeTask.identifier)}: ${truncateText(activeTask.title, 72)}`
    );
  }
  if (reviewTask) {
    actions.push(
      `Close review on ${toDisplayIdentifier(reviewTask.identifier)}: ${truncateText(reviewTask.title, 72)}`
    );
  }
  if (queuedTask) {
    actions.push(
      `Prepare ${toDisplayIdentifier(queuedTask.identifier)}: ${truncateText(queuedTask.title, 72)}`
    );
  }
  if (actions.length === 0 && workstream.status === "blocked") {
    actions.push(`Clear the current blocker on ${toDisplayIdentifier(workstream.identifier)}.`);
  }
  if (actions.length === 0) {
    actions.push(`No open linked work items. Monitor ${toDisplayIdentifier(workstream.identifier)} for new follow-up work.`);
  }

  return [...new Set(actions)].slice(0, 3);
}

function buildTimeline(workstream: WorkItem, descendants: WorkItem[]) {
  const timeline = [
    {
      timestamp: workstream.startedAt ?? workstream.createdAt,
      event: `${toDisplayIdentifier(workstream.identifier)} workstream started`,
      actor: workstream.assigneeName,
    },
    ...descendants
      .slice()
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
      .slice(0, 4)
      .map((item) => ({
        timestamp: item.updatedAt,
        event: `${toDisplayIdentifier(item.identifier)} updated · ${STATUS_LABELS[item.status]}`,
        actor: item.assigneeName,
      })),
  ]
    .sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    )
    .slice(-5);

  return timeline.map((entry) => ({
    date: formatDateLabel(entry.timestamp),
    event: entry.event,
    actor: entry.actor,
  }));
}

function buildTaskSummaries(descendants: WorkItem[]) {
  return descendants
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      identifier: toDisplayIdentifier(item.identifier),
      title: item.title,
      status: item.status,
      assignee: item.assigneeName,
      updatedAtLabel: formatRelativeTime(item.updatedAt),
    }));
}

function buildTags(meta: PhaseMeta, descendants: WorkItem[]): string[] {
  const activeTasks = descendants.filter((item) => item.status === "in_progress").length;
  const blockedTasks = descendants.filter((item) => item.status === "blocked").length;
  const doneTasks = descendants.filter((item) => item.status === "done").length;
  const tags = [...meta.topicTags.slice(0, 2)];

  if (activeTasks > 0) {
    tags.push(`${activeTasks} active`);
  }
  if (blockedTasks > 0) {
    tags.push(`${blockedTasks} blocked`);
  } else if (doneTasks > 0) {
    tags.push(`${doneTasks} done`);
  }

  return tags.length > 0 ? tags.slice(0, 4) : [meta.phaseLabel];
}

function buildWorkstreams(items: WorkItem[]): ProjectDetailData[] {
  const roots = items.filter((item) => item.parentId === null);
  if (roots.length === 0) {
    return [];
  }

  const childrenByParent = getChildrenByParent(items);
  const workstreams = roots
    .flatMap((root) => childrenByParent.get(root.id) ?? [])
    .slice()
    .sort((left, right) => {
      const leftMeta = getPhaseMeta(left.title);
      const rightMeta = getPhaseMeta(right.title);

      if (leftMeta.phaseNumber !== rightMeta.phaseNumber) {
        return leftMeta.phaseNumber - rightMeta.phaseNumber;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  return workstreams.map((workstream) => {
    const meta = getPhaseMeta(workstream.title);
    const descendants = collectDescendants(workstream.id, childrenByParent);
    const totalTasks = descendants.length;
    const activeTasks = descendants.filter((item) => item.status === "in_progress").length;
    const blockedTasks = descendants.filter((item) => item.status === "blocked").length;
    const doneTasks = descendants.filter((item) => item.status === "done").length;

    return {
      id: workstream.id,
      title: meta.shortTitle,
      subtitle: `${toDisplayIdentifier(workstream.identifier)} · ${meta.phaseLabel}`,
      stage: STATUS_LABELS[workstream.status],
      stageVariant: STATUS_VARIANTS[workstream.status],
      health: getHealth(workstream, descendants),
      status: workstream.status,
      assignee: workstream.assigneeName,
      daysActive: getDaysActive(workstream.startedAt ?? workstream.createdAt),
      lastActivityDate: formatRelativeTime(getLatestTimestamp(workstream, descendants)),
      latestSignal: buildLatestSignal(workstream, descendants),
      nextAction: buildNextAction(workstream, descendants),
      tags: buildTags(meta, descendants),
      totalTasks,
      activeTasks,
      blockedTasks,
      doneTasks,
      timeline: buildTimeline(workstream, descendants),
      actions: buildActions(workstream, descendants),
      tasks: buildTaskSummaries(descendants),
    };
  });
}

export default async function PipelinePage() {
  let isFallback = false;
  let workstreams: ProjectDetailData[] = [];

  try {
    const projects = await getProjects();
    const ssgProject = projects.find((project) => project.title === "SSG Lab");

    if (!ssgProject) {
      throw new Error("SSG Lab project not found.");
    }

    const workItems = await getProjectWorkItems(ssgProject.id, 30);
    workstreams = buildWorkstreams(workItems);

    if (workstreams.length === 0) {
      throw new Error("No pipeline workstreams found.");
    }
  } catch {
    isFallback = true;
    workstreams = FALLBACK_WORKSTREAMS;
  }

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Pipeline"
        description="Live SSG delivery workstreams and nested work-item flow."
        eyebrow="Delivery Pipeline"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Live delivery status</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Pipeline now reflects the real SSG workstream hierarchy instead of the static portfolio examples.
            </p>
          </div>
          {isFallback && <Badge variant="warning">Snapshot View</Badge>}
        </div>
      </Card>

      <PipelineBoard projects={workstreams} />
    </div>
  );
}
