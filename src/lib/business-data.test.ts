import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MatchRow,
  PortfolioItemRow,
  ProjectRow,
  SourcingResultRow,
} from "./supabase";

const {
  mockGetSupabaseClient,
  mockHasSupabaseCredentials,
} = vi.hoisted(() => ({
  mockGetSupabaseClient: vi.fn(),
  mockHasSupabaseCredentials: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getSupabaseClient: mockGetSupabaseClient,
  hasSupabaseCredentials: mockHasSupabaseCredentials,
}));

async function importBusinessDataModule() {
  vi.resetModules();
  return import("./business-data");
}

function createSupabaseClient(resolvers: {
  projects?: (operation: "limit" | "in", value?: unknown) => Promise<unknown>;
  portfolio_items?: (operation: "order", value?: unknown) => Promise<unknown>;
  sourcing_results?: (operation: "limit", value?: unknown) => Promise<unknown>;
  matches?: (operation: "limit", value?: unknown) => Promise<unknown>;
}) {
  return {
    from(table: string) {
      const resolver = resolvers[table as keyof typeof resolvers] as
        | ((operation: string, value?: unknown) => Promise<unknown>)
        | undefined;
      if (!resolver) {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select() {
          return {
            order(_column: string, _options?: unknown) {
              return {
                limit(value: number) {
                  return resolver("limit", value);
                },
              };
            },
            in(_column: string, value: unknown) {
              const promise = resolver("in", value);

              return Object.assign(promise, {
                order() {
                  return resolver("order", value);
                },
              });
            },
          };
        },
      };
    },
  };
}

describe("business data mappings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasSupabaseCredentials.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty business data when Supabase credentials are missing", async () => {
    mockHasSupabaseCredentials.mockReturnValue(false);

    const {
      getBusinessProjects,
      getMatches,
      getSourcingResults,
    } = await importBusinessDataModule();

    await expect(getBusinessProjects()).resolves.toEqual([]);
    await expect(getSourcingResults()).resolves.toEqual([]);
    await expect(getMatches()).resolves.toEqual([]);
    expect(mockGetSupabaseClient).not.toHaveBeenCalled();
  });

  it("maps business projects from Supabase tables", async () => {
    const projects: ProjectRow[] = [
      {
        id: "project-1",
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: "Diligence",
        status: "active",
        founder_name: "Avery Chen",
        founder_contact: "avery@example.com",
        description: "Workflow telemetry for operators.",
        source: "manual-review",
        metadata: { owner: "Frontend Engineer", tags: ["Priority"] },
        created_at: "2026-04-01T08:00:00Z",
        updated_at: "2026-04-01T10:00:00Z",
      },
    ];
    const portfolioItems: PortfolioItemRow[] = [
      {
        id: "portfolio-1",
        project_id: "project-1",
        status: "active",
        next_followup_at: "2099-04-03T00:00:00Z",
        last_activity: "Warm intro sent",
        notes: null,
        metadata: { tags: ["LP-ready"] },
        created_at: "2026-04-01T09:00:00Z",
        updated_at: "2026-04-01T11:00:00Z",
      },
    ];

    mockGetSupabaseClient.mockReturnValue(
      createSupabaseClient({
        projects: async () => ({ data: projects, error: null }),
        portfolio_items: async () => ({ data: portfolioItems, error: null }),
      })
    );

    const { getBusinessProjects } = await importBusinessDataModule();
    const result = await getBusinessProjects();

    expect(result).toEqual([
      {
        id: "project-1",
        title: "Signal Forge",
        description: "Workflow telemetry for operators.",
        status: "diligence",
        priority: "high",
        assigneeEmployee: "Frontend Engineer",
        founderName: "Avery Chen",
        companyName: "Signal Forge",
        stage: "Diligence",
        daysInStage: expect.any(Number),
        healthStatus: "on-track",
        lastActivity: "2026-04-01T11:00:00Z",
        nextFollowUp: "2099-04-03T00:00:00Z",
        tags: ["Dev Tools", "Diligence", "manual-review", "Priority", "LP-ready"],
      },
    ]);
  });

  it("maps sourcing rows into dashboard candidates using linked project data", async () => {
    const sourcingRows: SourcingResultRow[] = [
      {
        id: "source-1",
        project_id: "project-1",
        platform: "LinkedIn",
        url: "https://linkedin.example.com/avery",
        title: "Signal Forge",
        summary: "Strong operational fit",
        raw_data: {
          domain: "Dev Tools",
          stage: "Seed",
          relevanceScore: 0.92,
          status: "reviewed",
          sources: ["Manual review"],
          contact: { twitter: "@avery" },
          requestedBy: "CTO",
        },
        sourced_at: "2026-04-01T08:00:00Z",
        created_at: "2026-04-01T07:30:00Z",
      },
    ];
    const projects: ProjectRow[] = [
      {
        id: "project-1",
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: "Seed",
        status: "active",
        founder_name: "Avery Chen",
        founder_contact: "avery@example.com",
        description: "Ops stack",
        source: "manual-review",
        metadata: {},
        created_at: "2026-04-01T07:00:00Z",
        updated_at: "2026-04-01T09:00:00Z",
      },
    ];

    mockGetSupabaseClient.mockReturnValue(
      createSupabaseClient({
        sourcing_results: async () => ({ data: sourcingRows, error: null }),
        projects: async () => ({ data: projects, error: null }),
      })
    );

    const { getSourcingResults } = await importBusinessDataModule();
    const result = await getSourcingResults();

    expect(result).toEqual([
      {
        id: "source-1",
        founderName: "Avery Chen",
        companyName: "Signal Forge",
        domain: "Dev Tools",
        stage: "Seed",
        relevanceScore: 92,
        sources: ["Manual review", "LinkedIn"],
        contactEmail: "avery@example.com",
        contactTwitter: "@avery",
        contactLinkedin: undefined,
        matchReason: "Strong operational fit",
        createdAt: "2026-04-01T08:00:00Z",
        status: "reviewed",
        requestedBy: "CTO",
      },
    ]);
  });

  it("maps matches into dashboard cards and normalizes percentage confidence", async () => {
    const matchRows: MatchRow[] = [
      {
        id: "match-1",
        project_id: "project-1",
        match_type: "mentor",
        confidence_score: 0.88,
        rationale: "High-leverage advisor intro",
        matched_with: "Operator Guild",
        status: "accepted",
        metadata: {
          sideA: {
            entity: "Signal Forge",
            description: "Workflow telemetry for operators.",
            sourceEmployee: "CTO",
          },
          sideB: {
            description: "Operator network",
            sourceEmployee: "Frontend Engineer",
          },
        },
        created_at: "2026-04-01T08:00:00Z",
      },
    ];
    const projects: ProjectRow[] = [
      {
        id: "project-1",
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: "Seed",
        status: "active",
        founder_name: "Avery Chen",
        founder_contact: "avery@example.com",
        description: "Workflow telemetry for operators.",
        source: "manual-review",
        metadata: {},
        created_at: "2026-04-01T07:00:00Z",
        updated_at: "2026-04-01T09:00:00Z",
      },
    ];

    mockGetSupabaseClient.mockReturnValue(
      createSupabaseClient({
        matches: async () => ({ data: matchRows, error: null }),
        projects: async () => ({ data: projects, error: null }),
      })
    );

    const { getMatches } = await importBusinessDataModule();
    const result = await getMatches();

    expect(result).toEqual([
      {
        id: "match-1",
        type: "mentor",
        confidence: 88,
        sideA: {
          entity: "Signal Forge",
          description: "Workflow telemetry for operators.",
          sourceEmployee: "CTO",
        },
        sideB: {
          entity: "Operator Guild",
          description: "Operator network",
          sourceEmployee: "Frontend Engineer",
        },
        suggestion: "High-leverage advisor intro",
        status: "accepted",
        createdAt: "2026-04-01T08:00:00Z",
      },
    ]);
  });
});
