import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface ProjectTeam {
  ceo_founder?: string;
  ceo_background?: string;
  core_team?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  one_liner?: string;
  category?: string;
  sector?: string;
  pipeline_stage?: string;
  funding_round?: string;
  investment_status?: string;
  team?: ProjectTeam;
  product_highlights?: string[];
  market?: string;
  current_progress?: string;
  demo_date?: string;
  demo_event?: string;
  source_employee?: string;
  source_date?: string;
  updated_at?: string;
}

export function getProject(id: string): ProjectData | null {
  try {
    const filePath = join(process.cwd(), "data", "projects", `${id}.json`);
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ProjectData;
  } catch {
    return null;
  }
}

export function getAllProjectIds(): string[] {
  try {
    const dir = join(process.cwd(), "data", "projects");
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}
