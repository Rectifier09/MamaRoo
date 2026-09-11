import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("placeholder content", () => {
  it("is clearly labelled as never-ship", () => {
    const sql = readFileSync("supabase/seed/content.placeholder.sql", "utf8");
    expect(sql).toContain("NEVER SHIP THIS FILE");
  });

  it("is not referenced from any migration, so a deploy cannot apply it", () => {
    // Real filenames in this repo, not the plan's hypothetical numbering: 0002 went
    // to the out-of-sequence waitlist migration, so daily/care/content shifted to
    // 0003/0004/0005.
    const hits = ["0001_identity", "0002_waitlist", "0003_daily", "0004_care", "0005_content"]
      .filter((f) => existsSync(`supabase/migrations/${f}.sql`))
      .map((f) => readFileSync(`supabase/migrations/${f}.sql`, "utf8"))
      .filter((sql) => sql.includes("placeholder"));
    expect(hits).toEqual([]);
  });

  it("never applies placeholder content from a deploy or release path", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    for (const [name, script] of Object.entries(pkg.scripts)) {
      if (name === "db:seed:placeholder") continue;
      expect(script, `script "${name}"`).not.toContain("placeholder");
    }
  });
});
