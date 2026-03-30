import { describe, expect, it } from "vitest";
import {
  compareHeartbeatRunsDesc,
  getHeartbeatRunActivityAt,
  hasStartedHeartbeatRun,
  isCompletedHeartbeatRunStatus,
  mapHeartbeatRunStatus,
} from "./heartbeat-runs";

describe("mapHeartbeatRunStatus", () => {
  it("maps queued to queued", () => {
    expect(mapHeartbeatRunStatus("queued")).toBe("queued");
  });

  it("maps running to running", () => {
    expect(mapHeartbeatRunStatus("running")).toBe("running");
  });

  it("maps succeeded to succeeded", () => {
    expect(mapHeartbeatRunStatus("succeeded")).toBe("succeeded");
  });

  it("maps failed to failed", () => {
    expect(mapHeartbeatRunStatus("failed")).toBe("failed");
  });

  it("maps timed_out to failed", () => {
    expect(mapHeartbeatRunStatus("timed_out")).toBe("failed");
  });

  it("maps cancelled to failed", () => {
    expect(mapHeartbeatRunStatus("cancelled")).toBe("failed");
  });
});

describe("hasStartedHeartbeatRun", () => {
  it("returns true for a run with startedAt", () => {
    const run = { startedAt: "2026-03-30T00:00:00Z" };
    expect(hasStartedHeartbeatRun(run)).toBe(true);
  });

  it("returns false for a run with undefined startedAt", () => {
    const run = { startedAt: undefined };
    expect(hasStartedHeartbeatRun(run)).toBe(false);
  });

  it("returns false for a run with empty startedAt", () => {
    const run = { startedAt: "" };
    expect(hasStartedHeartbeatRun(run)).toBe(false);
  });

  it("narrows type when used as a guard", () => {
    const run = { startedAt: "2026-03-30T00:00:00Z" as string | undefined };
    if (hasStartedHeartbeatRun(run)) {
      const _narrowed: string = run.startedAt;
      expect(_narrowed).toBe("2026-03-30T00:00:00Z");
    }
  });
});

describe("getHeartbeatRunActivityAt", () => {
  it("returns startedAt when available", () => {
    expect(
      getHeartbeatRunActivityAt({
        startedAt: "2026-03-30T01:00:00Z",
        createdAt: "2026-03-30T00:00:00Z",
      })
    ).toBe("2026-03-30T01:00:00Z");
  });

  it("falls back to createdAt when startedAt is null", () => {
    expect(
      getHeartbeatRunActivityAt({
        startedAt: null,
        createdAt: "2026-03-30T00:00:00Z",
      })
    ).toBe("2026-03-30T00:00:00Z");
  });

  it("falls back to updatedAt when both are null", () => {
    expect(
      getHeartbeatRunActivityAt({
        startedAt: null,
        createdAt: null,
        updatedAt: "2026-03-29T00:00:00Z",
      })
    ).toBe("2026-03-29T00:00:00Z");
  });

  it("returns epoch when all timestamps are null", () => {
    expect(
      getHeartbeatRunActivityAt({
        startedAt: null,
        createdAt: null,
        updatedAt: null,
      })
    ).toBe("1970-01-01T00:00:00.000Z");
  });
});

describe("isCompletedHeartbeatRunStatus", () => {
  it("returns false for queued", () => {
    expect(isCompletedHeartbeatRunStatus("queued")).toBe(false);
  });

  it("returns false for running", () => {
    expect(isCompletedHeartbeatRunStatus("running")).toBe(false);
  });

  it("returns true for succeeded", () => {
    expect(isCompletedHeartbeatRunStatus("succeeded")).toBe(true);
  });

  it("returns true for failed", () => {
    expect(isCompletedHeartbeatRunStatus("failed")).toBe(true);
  });

  it("returns true for timed_out", () => {
    expect(isCompletedHeartbeatRunStatus("timed_out")).toBe(true);
  });

  it("returns true for cancelled", () => {
    expect(isCompletedHeartbeatRunStatus("cancelled")).toBe(true);
  });
});

describe("compareHeartbeatRunsDesc", () => {
  it("sorts newer runs first", () => {
    const older = { activityAt: "2026-03-29T00:00:00Z" };
    const newer = { activityAt: "2026-03-30T00:00:00Z" };
    expect(compareHeartbeatRunsDesc(older, newer)).toBeGreaterThan(0);
    expect(compareHeartbeatRunsDesc(newer, older)).toBeLessThan(0);
  });

  it("returns 0 for equal timestamps", () => {
    const run = { activityAt: "2026-03-30T00:00:00Z" };
    expect(compareHeartbeatRunsDesc(run, run)).toBe(0);
  });
});
