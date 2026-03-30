import { formatDateLabel, formatRelativeTime, truncateText } from "./format";
import type { WorkItem } from "./types";

type HealthStatus = "on-track" | "needs-attention" | "at-risk" | "overdue";
type StageVariant = "default" | "info" | "warning" | "success" | "danger";

export interface PipelineTaskSummary {
  id: string;
  identifier: string;
  title: string;
  status: WorkItem["status"];
  assignee: string;
  updatedAtLabel: string;
}

export interface PipelineTimelineEntry {
  date: string;
  event: string;
  actor: string;
}

export interface PipelineWorkstream {
  id: string;
  title: string;
  subtitle: string;
  stage: string;
  stageVariant: StageVariant;
  health: HealthStatus;
  status: WorkItem["status"];
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
  timeline: PipelineTimelineEntry[];
  actions: string[];
  tasks: PipelineTaskSummary[];
}

interface PhaseMeta {
  phaseLabel: string;
  phaseNumber: number;
  shortTitle: string;
  topicTags: string[];
}

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
    actions.push(`Advance ${activeTask.identifier}: ${truncateText(activeTask.title, 72)}`);
  }
  if (reviewTask) {
    actions.push(`Close review on ${reviewTask.identifier}: ${truncateText(reviewTask.title, 72)}`);
  }
  if (queuedTask) {
    actions.push(`Prepare ${queuedTask.identifier}: ${truncateText(queuedTask.title, 72)}`);
  }
  if (actions.length === 0 && workstream.status === "blocked") {
    actions.push(`Clear the current blocker on ${workstream.identifier}.`);
  }
  if (actions.length === 0) {
    actions.push(`No open child tasks. Monitor ${workstream.identifier} for new follow-up work.`);
  }

  return [...new Set(actions)].slice(0, 3);
}

function buildTimeline(workstream: WorkItem, descendants: WorkItem[]): PipelineTimelineEntry[] {
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

function buildTaskSummaries(descendants: WorkItem[]): PipelineTaskSummary[] {
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

function getWorkstreamRoots(
  items: WorkItem[],
  childrenByParent: Map<string, WorkItem[]>
): WorkItem[] {
  return items
    .filter((item) => item.parentId === null)
    .flatMap((root) => {
      const directChildren = childrenByParent.get(root.id) ?? [];
      return directChildren.length > 0 ? directChildren : [root];
    });
}

export function buildWorkstreams(items: WorkItem[]): PipelineWorkstream[] {
  const childrenByParent = getChildrenByParent(items);
  const workstreams = getWorkstreamRoots(items, childrenByParent)
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
