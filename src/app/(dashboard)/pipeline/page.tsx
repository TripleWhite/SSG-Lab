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
    subtitle: "MIM-307 · Phase 1",
    stage: "In Progress",
    stageVariant: "success",
    health: "at-risk",
    status: "in_progress",
    assignee: "CTO",
    daysActive: 1,
    lastActivityDate: "22m ago",
    latestSignal: "1 blocked infra task, 2 queued follow-ups, and 1 cancelled backend branch. Progress is waiting on upstream credentials.",
    nextAction: "Resolve the EC2-B and Feishu blockers before verification work can start.",
    tags: ["EC2-B", "Feishu", "1 blocked", "2 queued"],
    totalTasks: 4,
    activeTasks: 0,
    blockedTasks: 1,
    doneTasks: 0,
    timeline: [
      { date: "Mar 28", event: "MIM-307 workstream started", actor: "CTO" },
      { date: "Mar 28", event: "MIM-312 updated · Blocked", actor: "Release Engineer" },
      { date: "Mar 28", event: "MIM-315 queued for review", actor: "Security Reviewer" },
    ],
    actions: [
      "Resolve the EC2-B deployment blocker before downstream verification can begin.",
      "Re-sequence the queued review and docs tasks once infra is reachable.",
      "Keep the cancelled Mimir server branch out of the active rollout path.",
    ],
    tasks: [
      {
        id: "phase-1-task-1",
        identifier: "MIM-312",
        title: "Provision EC2-B + Deploy Paperclip + OpenClaw + Caddy + Feishu",
        status: "blocked",
        assignee: "Release Engineer",
        updatedAtLabel: "22m ago",
      },
      {
        id: "phase-1-task-2",
        identifier: "MIM-314",
        title: "Phase 1 E2E Verification — Feishu → Mimir pipeline",
        status: "backlog",
        assignee: "QA Engineer",
        updatedAtLabel: "1d ago",
      },
    ],
  },
  {
    id: "phase-2",
    title: "Sourcing Agent",
    subtitle: "MIM-308 · Phase 2",
    stage: "Blocked",
    stageVariant: "danger",
    health: "at-risk",
    status: "blocked",
    assignee: "CTO",
    daysActive: 0,
    lastActivityDate: "4h ago",
    latestSignal: "This workstream is still blocked behind Phase 1 system readiness and has no child tasks started yet.",
    nextAction: "Wait for the shared infrastructure dependencies to clear before opening implementation tasks.",
    tags: ["parallel search", "7 platforms", "blocked"],
    totalTasks: 0,
    activeTasks: 0,
    blockedTasks: 0,
    doneTasks: 0,
    timeline: [
      { date: "Mar 29", event: "MIM-308 status set to Blocked", actor: "CTO" },
    ],
    actions: [
      "Keep this workstream parked until the shared Paperclip and Feishu dependencies are live.",
      "Do not create downstream sourcing tasks before the infra dependency is removed.",
    ],
    tasks: [],
  },
  {
    id: "phase-3",
    title: "Matching Agent",
    subtitle: "MIM-309 · Phase 3",
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
      { date: "Mar 28", event: "MIM-309 status set to Blocked", actor: "CTO" },
    ],
    actions: [
      "Wait on the upstream data plane before opening matching implementation tasks.",
      "Preserve this workstream as a dependency marker, not an active build branch.",
    ],
    tasks: [],
  },
  {
    id: "phase-4",
    title: "Portfolio Agent",
    subtitle: "MIM-310 · Phase 4",
    stage: "Blocked",
    stageVariant: "danger",
    health: "at-risk",
    status: "blocked",
    assignee: "CTO",
    daysActive: 0,
    lastActivityDate: "5h ago",
    latestSignal: "Portfolio automation is still waiting on the same upstream delivery chain and has not opened its daily-scan tasks yet.",
    nextAction: "Hold until the platform dependencies move out of blocked status.",
    tags: ["daily scans", "digests", "blocked"],
    totalTasks: 0,
    activeTasks: 0,
    blockedTasks: 0,
    doneTasks: 0,
    timeline: [
      { date: "Mar 28", event: "MIM-310 status set to Blocked", actor: "CTO" },
    ],
    actions: [
      "Keep the workstream blocked until the shared integrations are available.",
      "Open the daily-digest tasks only after the upstream agents can write live data.",
    ],
    tasks: [],
  },
  {
    id: "phase-5",
    title: "Dashboard Integration",
    subtitle: "MIM-311 · Phase 5",
    stage: "In Progress",
    stageVariant: "success",
    health: "on-track",
    status: "in_progress",
    assignee: "CTO",
    daysActive: 0,
    lastActivityDate: "Just now",
    latestSignal: "1 task is active and 4 downstream review or QA tasks are queued. The live data layer is partially shipped and the remaining work is concentrated in the pipeline, matching, and sourcing routes.",
    nextAction: "Finish the remaining live route conversions and hand the branch to review.",
    tags: ["live data", "polling", "1 active", "4 queued"],
    totalTasks: 5,
    activeTasks: 1,
    blockedTasks: 0,
    doneTasks: 0,
    timeline: [
      { date: "Mar 29", event: "MIM-311 workstream started", actor: "CTO" },
      { date: "Mar 29", event: "MIM-318 updated · In Progress", actor: "Frontend Engineer" },
      { date: "Mar 29", event: "MIM-319 queued for code review", actor: "Security Reviewer" },
    ],
    actions: [
      "Finish the remaining live route conversions on MIM-318.",
      "Queue MIM-319 once the implementation branch is stable.",
      "Keep QA and design review tasks gated behind the live data merge.",
    ],
    tasks: [
      {
        id: "phase-5-task-1",
        identifier: "MIM-318",
        title: "Implement Phase 5 Dashboard Integration — API clients, live data, polling",
        status: "in_progress",
        assignee: "Frontend Engineer",
        updatedAtLabel: "Just now",
      },
      {
        id: "phase-5-task-2",
        identifier: "MIM-319",
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
    return `${workstream.identifier} is ${STATUS_LABELS[workstream.status].toLowerCase()} with no child tasks started yet.`;
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
    return `Resolve ${blockedTask.identifier} before downstream work can move.`;
  }

  const activeTask = descendants.find((item) => item.status === "in_progress");
  if (activeTask) {
    return `Advance ${activeTask.identifier} through implementation and verification.`;
  }

  const reviewTask = descendants.find((item) => item.status === "in_review");
  if (reviewTask) {
    return `Close review on ${reviewTask.identifier}.`;
  }

  const queuedTask = descendants.find(
    (item) => item.status === "backlog" || item.status === "todo"
  );
  if (queuedTask) {
    return `Start ${queuedTask.identifier} when dependencies are clear.`;
  }

  if (workstream.status === "blocked") {
    return `Unblock ${workstream.identifier} before execution can resume.`;
  }

  return `Monitor ${workstream.identifier} for the next assignment change.`;
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
      `Resolve blocker on ${blockedTask.identifier}: ${truncateText(blockedTask.title, 72)}`
    );
  }
  if (activeTask) {
    actions.push(
      `Advance ${activeTask.identifier}: ${truncateText(activeTask.title, 72)}`
    );
  }
  if (reviewTask) {
    actions.push(
      `Close review on ${reviewTask.identifier}: ${truncateText(reviewTask.title, 72)}`
    );
  }
  if (queuedTask) {
    actions.push(
      `Prepare ${queuedTask.identifier}: ${truncateText(queuedTask.title, 72)}`
    );
  }
  if (actions.length === 0 && workstream.status === "blocked") {
    actions.push(`Clear the current blocker on ${workstream.identifier}.`);
  }
  if (actions.length === 0) {
    actions.push(`No open child tasks. Monitor ${workstream.identifier} for new follow-up work.`);
  }

  return [...new Set(actions)].slice(0, 3);
}

function buildTimeline(workstream: WorkItem, descendants: WorkItem[]) {
  const timeline = [
    {
      timestamp: workstream.startedAt ?? workstream.createdAt,
      event: `${workstream.identifier} workstream started`,
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
        event: `${item.identifier} updated · ${STATUS_LABELS[item.status]}`,
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
      identifier: item.identifier,
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
      subtitle: `${workstream.identifier} · ${meta.phaseLabel}`,
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
        title="Projects"
        description="Live SSG delivery workstreams and nested task pipeline from Paperclip"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Live Paperclip status</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Pipeline now reflects the real SSG workstream hierarchy instead of the static portfolio examples.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">30s Refresh</Badge>
            {isFallback && <Badge variant="warning">Fallback Active</Badge>}
          </div>
        </div>
      </Card>

      <PipelineBoard projects={workstreams} />
    </div>
  );
}
