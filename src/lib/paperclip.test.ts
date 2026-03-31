import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function importPaperclipModule() {
  vi.resetModules();
  return import("./paperclip");
}

describe("paperclip live result feeds", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      PAPERCLIP_API_URL: "https://paperclip.test",
      PAPERCLIP_API_KEY: "test-key",
      PAPERCLIP_COMPANY_ID: "company-1",
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("maps sourcing result documents into dashboard candidates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "project-1",
            name: "SSG Lab",
            description: "Dashboard project",
            status: "planned",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "parent-sourcing",
            identifier: "MIM-500",
            title: "Sourcing Results",
            description: "",
            status: "todo",
            priority: "medium",
            createdAt: "2026-03-31T00:00:00Z",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "candidate-1",
            identifier: "MIM-501",
            title: "Sourcing: Acme AI / Alice Chen",
            description: "High-signal founder",
            status: "in_progress",
            priority: "high",
            createdAt: "2026-03-31T10:00:00Z",
            updatedAt: "2026-03-31T10:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse({
          key: "result",
          format: "json",
          body: JSON.stringify({
            founderName: "Alice Chen",
            companyName: "Acme AI",
            domain: "AI Infra",
            stage: "Seed",
            relevanceScore: 92,
            sources: ["GitHub", "X"],
            contactEmail: "alice@acme.ai",
            matchReason: "Strong distribution fit",
            requestedBy: "CTO",
          }),
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getSourcingResults } = await importPaperclipModule();
    const results = await getSourcingResults();

    expect(results).toEqual([
      {
        id: "candidate-1",
        founderName: "Alice Chen",
        companyName: "Acme AI",
        domain: "AI Infra",
        stage: "Seed",
        relevanceScore: 92,
        sources: ["GitHub", "X"],
        contactEmail: "alice@acme.ai",
        contactTwitter: undefined,
        contactLinkedin: undefined,
        matchReason: "Strong distribution fit",
        createdAt: "2026-03-31T10:00:00Z",
        status: "reviewed",
        requestedBy: "CTO",
      },
    ]);
  });

  it("returns an empty sourcing list when no results parent issue exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "project-1",
            name: "SSG Lab",
            description: "Dashboard project",
            status: "planned",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(jsonResponse([]));

    vi.stubGlobal("fetch", fetchMock);

    const { getSourcingResults } = await importPaperclipModule();
    await expect(getSourcingResults()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an empty sourcing list when the SSG Lab project is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        {
          id: "project-1",
          name: "Mimir",
          description: "Different project",
          status: "planned",
          updatedAt: "2026-03-31T00:00:00Z",
        },
      ])
    );

    vi.stubGlobal("fetch", fetchMock);

    const { getSourcingResults } = await importPaperclipModule();
    await expect(getSourcingResults()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps and sorts matching results while tolerating mixed document payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "project-1",
            name: "SSG Lab",
            description: "Dashboard project",
            status: "planned",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "parent-matching",
            identifier: "MIM-600",
            title: "Matching Results",
            description: "",
            status: "todo",
            priority: "medium",
            createdAt: "2026-03-31T00:00:00Z",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "match-older",
            identifier: "MIM-601",
            title: "Match: Founder A ↔ Mentor B",
            description: "Older suggestion",
            status: "done",
            priority: "medium",
            createdAt: "2026-03-30T08:00:00Z",
            updatedAt: "2026-03-30T08:00:00Z",
          },
          {
            id: "match-newer",
            identifier: "MIM-602",
            title: "Match: Portfolio Co ↔ LP Partner",
            description: "Newer suggestion",
            status: "todo",
            priority: "medium",
            createdAt: "2026-03-31T12:00:00Z",
            updatedAt: "2026-03-31T12:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse({
          key: "result",
          format: "json",
          body: {
            type: "mentor",
            confidence: 88,
            sideA: {
              entity: "Founder A",
              description: "Seeking guidance",
              sourceEmployee: "Frontend Engineer",
            },
            sideB: {
              entity: "Mentor B",
              description: "GTM advisor",
              sourceEmployee: "CTO",
            },
            suggestion: "Intro recommended this week",
            createdAt: "2026-03-30T08:00:00Z",
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          key: "result",
          format: "json",
          body: JSON.stringify({
            type: "investor",
            confidence: 95,
            sideA: {
              entity: "Portfolio Co",
              description: "Raising bridge round",
              sourceEmployee: "Portfolio Agent",
            },
            sideB: {
              entity: "LP Partner",
              description: "Warm capital source",
              sourceEmployee: "CEO",
            },
            suggestion: "High-priority intro",
            status: "dismissed",
            createdAt: "2026-03-31T12:00:00Z",
          }),
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getMatches } = await importPaperclipModule();
    const results = await getMatches();

    expect(results).toEqual([
      {
        id: "match-newer",
        type: "investor",
        confidence: 95,
        sideA: {
          entity: "Portfolio Co",
          description: "Raising bridge round",
          sourceEmployee: "Portfolio Agent",
        },
        sideB: {
          entity: "LP Partner",
          description: "Warm capital source",
          sourceEmployee: "CEO",
        },
        suggestion: "High-priority intro",
        status: "dismissed",
        createdAt: "2026-03-31T12:00:00Z",
      },
      {
        id: "match-older",
        type: "mentor",
        confidence: 88,
        sideA: {
          entity: "Founder A",
          description: "Seeking guidance",
          sourceEmployee: "Frontend Engineer",
        },
        sideB: {
          entity: "Mentor B",
          description: "GTM advisor",
          sourceEmployee: "CTO",
        },
        suggestion: "Intro recommended this week",
        status: "accepted",
        createdAt: "2026-03-30T08:00:00Z",
      },
    ]);
  });
});
