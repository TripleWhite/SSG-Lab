import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const tsconfigPath = path.join(repoRoot, "tsconfig.json");
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8")) as {
  include?: string[];
  exclude?: string[];
};

describe("tsconfig build scope", () => {
  it("limits production type-checking to app sources and explicit config files", () => {
    expect(tsconfig.include).toEqual([
      "next-env.d.ts",
      "next.config.ts",
      "vitest.config.ts",
      "src/**/*.ts",
      "src/**/*.tsx",
      ".next/types/**/*.ts",
      ".next/dev/types/**/*.ts",
    ]);
  });

  it("excludes QA worktrees and agent skill mirrors from production type-checking", () => {
    expect(tsconfig.exclude).toEqual(["node_modules", ".gstack", ".agents"]);
  });
});
