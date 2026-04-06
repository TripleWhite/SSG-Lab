import resourceSeed from "../../data/resource-graph-seed.json";
import type { ResourceGraph, ResourceItem } from "./types";

const MIMIR_URL = process.env.MIMIR_API_URL || "https://api.allinmimir.com";
const MIMIR_KEY = process.env.MIMIR_API_KEY || "";
const MIMIR_USER_ID = process.env.MIMIR_USER_ID || "system";
const DEFAULT_REVALIDATE_SECONDS = 30;

interface MimirEntity {
  name?: string;
  title?: string;
  type?: string;
  entityType?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface MimirSearchEnvelope<T> {
  results?: T[];
  items?: T[];
  data?: T[];
}

async function fetchMimir<T>(path: string): Promise<T> {
  if (!MIMIR_KEY) {
    throw new Error("Mimir API key is not configured.");
  }

  const res = await fetch(`${MIMIR_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${MIMIR_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "mimir-agent/1.0",
    },
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`Mimir API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function normalizeSearchResults<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const envelope = payload as MimirSearchEnvelope<T>;
    if (Array.isArray(envelope.results)) {
      return envelope.results;
    }
    if (Array.isArray(envelope.items)) {
      return envelope.items;
    }
    if (Array.isArray(envelope.data)) {
      return envelope.data;
    }
  }

  return [];
}

function toResourceItem(name: string, tags: string[]): ResourceItem {
  return {
    name,
    tags: tags.filter(Boolean),
  };
}

interface SeedEmployee {
  name: string;
  connections: string[];
}

interface SeedLpInvestor {
  name: string;
  focus_sectors: string[];
}

interface SeedMentor {
  name: string;
  expertise: string[];
}

function getSeedGraph(): ResourceGraph {
  const employees = resourceSeed.employees as SeedEmployee[];
  const lpInvestors = resourceSeed.lp_investors as SeedLpInvestor[];
  const mentors = resourceSeed.mentors as SeedMentor[];

  return {
    source: "seed",
    connections: employees.map((employee) =>
      toResourceItem(employee.name, employee.connections),
    ),
    investors: lpInvestors.map((investor) =>
      toResourceItem(investor.name, investor.focus_sectors),
    ),
    mentors: mentors.map((mentor) =>
      toResourceItem(mentor.name, mentor.expertise),
    ),
    programs: resourceSeed.partner_programs.map((program) =>
      toResourceItem(program.name, [program.type, program.benefit]),
    ),
  };
}

function classifyEntity(
  entity: MimirEntity,
): keyof Omit<ResourceGraph, "source"> {
  const rawType =
    `${entity.type ?? ""} ${entity.entityType ?? ""} ${entity.name ?? ""}`.toLowerCase();
  if (rawType.includes("mentor")) {
    return "mentors";
  }
  if (rawType.includes("investor") || rawType.includes("lp")) {
    return "investors";
  }
  if (rawType.includes("program") || rawType.includes("partner")) {
    return "programs";
  }
  return "connections";
}

function tagsFromEntity(entity: MimirEntity): string[] {
  if (Array.isArray(entity.tags)) {
    return entity.tags.filter((tag): tag is string => typeof tag === "string");
  }

  if (entity.metadata && typeof entity.metadata === "object") {
    const values = Object.values(entity.metadata).flatMap((value) =>
      Array.isArray(value) ? value : typeof value === "string" ? [value] : [],
    );
    return values.filter((value): value is string => typeof value === "string");
  }

  return [];
}

export async function searchMemory(query: string): Promise<unknown[]> {
  if (!MIMIR_KEY) {
    return [];
  }

  try {
    const payload = await fetchMimir<unknown>(
      `/api/v1/search?user_id=${encodeURIComponent(MIMIR_USER_ID)}&query=${encodeURIComponent(query)}&method=full&limit=20`,
    );
    return normalizeSearchResults(payload);
  } catch {
    return [];
  }
}

export async function getProjectTimeline(
  projectName: string,
): Promise<unknown[]> {
  return searchMemory(projectName);
}

export async function getResourceGraph(): Promise<ResourceGraph> {
  if (!MIMIR_KEY) {
    return getSeedGraph();
  }

  try {
    const payload = await fetchMimir<unknown>(
      `/api/v1/search?user_id=${encodeURIComponent(MIMIR_USER_ID)}&query=${encodeURIComponent(
        "resource connection mentor LP partner",
      )}&types=entity&method=full&limit=100`,
    );
    const entities = normalizeSearchResults<MimirEntity>(payload);

    if (entities.length === 0) {
      return getSeedGraph();
    }

    const graph: ResourceGraph = {
      source: "live",
      connections: [],
      investors: [],
      mentors: [],
      programs: [],
    };

    for (const entity of entities) {
      const name = entity.name ?? entity.title ?? "Untitled";
      const bucket = classifyEntity(entity);
      graph[bucket].push(toResourceItem(name, tagsFromEntity(entity)));
    }

    return graph;
  } catch {
    return getSeedGraph();
  }
}
