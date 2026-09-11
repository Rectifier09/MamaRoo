import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const ALLOWED_RUNTIME = [
  "next", "react", "react-dom", "@supabase/supabase-js", "@supabase/ssr", "next-intl",
  "zod", "@phosphor-icons/react", "lottie-web", "react-markdown", "posthog-js",
  "d3-scale", "serwist", "@serwist/next", "server-only",
];

describe("dependency discipline", () => {
  it("adds no runtime dependency outside the allowlist", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
    };
    const extra = Object.keys(pkg.dependencies ?? {}).filter(
      (name) => !ALLOWED_RUNTIME.includes(name) && !name.startsWith("@google"),
    );
    // A library pulled in for a problem a few lines of code would solve is the most
    // common way an agent-built codebase gains weight. Any addition is a decision.
    expect(extra).toEqual([]);
  });
});
