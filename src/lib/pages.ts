import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { PageData } from "@/components/dynamic-page/types";

const PAGES_DIR = path.join(process.cwd(), "data", "pages");

export async function getPageData(slug: string): Promise<PageData | null> {
  // Prevent directory traversal
  if (slug.includes("..") || slug.includes("/")) return null;

  try {
    const raw = await readFile(path.join(PAGES_DIR, `${slug}.json`), "utf-8");
    return JSON.parse(raw) as PageData;
  } catch {
    return null;
  }
}

export async function getAllPageSlugs(): Promise<string[]> {
  try {
    const files = await readdir(PAGES_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}
