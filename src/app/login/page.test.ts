import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./page.tsx", import.meta.url)), "utf8");

describe("login page sign-in CTA", () => {
  it("renders the configured sign-in flow as a native anchor", () => {
    expect(source).toContain("href={signInHref}");
    expect(source).toContain("<a");
  });

  it("does not use next/link for the Feishu sign-in CTA", () => {
    expect(source).not.toContain('import Link from "next/link"');
    expect(source).not.toMatch(/<Link[\s\S]*Sign in with Feishu/);
  });
});
