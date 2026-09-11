import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FORBIDDEN = ["react", "react-dom", "next", "@supabase", "posthog-js", "lottie-web", "node:fs", "node:child_process"];

/**
 * Matches BOTH quote styles and all three import forms. The obvious version of this
 * guard greps only for single quotes, which silently never matches a codebase written
 * with double quotes — a guard that can never fail is worse than no guard, because it
 * reads as protection.
 *
 * Runs grep via execFileSync (argv array, no shell) rather than a shell string: the
 * pattern's own ['"] character class embeds a literal double-quote, which closes a
 * double-quoted shell string early and breaks on the next "(" as a syntax error.
 * Passing the pattern as an argv element sidesteps shell quoting entirely.
 */
function importsOf(dir: string): string {
  const alternatives = FORBIDDEN.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = `(from|import|require)\\s*\\(?\\s*['"](${alternatives})(/|['"])`;
  try {
    return execFileSync("grep", ["-rnE", pattern, dir], { encoding: "utf8" }).trim();
  } catch (err) {
    // grep exits 1 when it finds no matches, which is a normal outcome here, not a
    // failure -- only a genuine error (exit code >= 2, e.g. a bad pattern) should throw.
    const status = (err as { status?: number }).status;
    if (status === 1) return "";
    throw err;
  }
}

describe("domain purity", () => {
  it("imports nothing that performs I/O", () => {
    expect(importsOf("lib/domain")).toBe("");
  });

  it("actually detects a violation, in both quote styles and all import forms", () => {
    const dir = mkdtempSync(join(tmpdir(), "purity-"));
    try {
      writeFileSync(join(dir, "a.ts"), `import { useState } from "react";\n`);
      writeFileSync(join(dir, "b.ts"), `import { cookies } from 'next/headers';\n`);
      writeFileSync(join(dir, "c.ts"), `const fs = require("node:fs");\n`);
      writeFileSync(join(dir, "d.ts"), `await import("@supabase/supabase-js");\n`);
      const hits = importsOf(dir).split("\n").filter(Boolean);
      expect(hits).toHaveLength(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
