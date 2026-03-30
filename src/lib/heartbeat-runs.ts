import type { HeartbeatRun } from "./types";

export type RawHeartbeatRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled";

interface HeartbeatRunTimestamps {
  startedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function getHeartbeatRunActivityAt(run: HeartbeatRunTimestamps): string {
  return run.startedAt ?? run.createdAt ?? run.updatedAt ?? new Date(0).toISOString();
}

export function mapHeartbeatRunStatus(status: RawHeartbeatRunStatus): HeartbeatRun["status"] {
  switch (status) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
      return "succeeded";
    default:
      return "failed";
  }
}

interface StartedHeartbeatRun {
  startedAt: string;
}

export function hasStartedHeartbeatRun(
  run: Pick<HeartbeatRun, "startedAt">
): run is Pick<HeartbeatRun, "startedAt"> & StartedHeartbeatRun {
  return typeof run.startedAt === "string" && run.startedAt.length > 0;
}

export function isCompletedHeartbeatRunStatus(status: RawHeartbeatRunStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "timed_out" || status === "cancelled";
}

export function compareHeartbeatRunsDesc(
  left: Pick<HeartbeatRun, "activityAt">,
  right: Pick<HeartbeatRun, "activityAt">
): number {
  return new Date(right.activityAt).getTime() - new Date(left.activityAt).getTime();
}
