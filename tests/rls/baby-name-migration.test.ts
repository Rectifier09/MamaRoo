// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/0008_baby_name.sql", "utf8");
const compact = sql.toLowerCase().replace(/\s+/g, " ");

describe("baby name migration", () => {
  it("preserves an existing name as one array item and maps null to an empty array", () => {
    expect(compact).toContain("alter column baby_name type text[]");
    expect(compact).toMatch(
      /using case when baby_name is null then '\{\}'::text\[\] else array\[baby_name\] end/,
    );
    expect(compact).toContain("alter column baby_name set default '{}'::text[]");
    expect(compact).toContain("alter column baby_name set not null");
  });

  it("checks every stored name and bounds the count for singleton and twin pregnancies", () => {
    expect(compact).toContain("unnest(names)");
    expect(compact).toContain("length(btrim(name)) between 1 and 60");
    expect(compact).toContain("cardinality(baby_name)");
    expect(compact).toContain("'twins' = any(pregnancy_flags)");
  });

  it("uses read-only catalog RLS and owner-scoped favorites RLS", () => {
    expect(compact).toContain("alter table public.baby_names enable row level security");
    expect(compact).toContain("for select to authenticated using (is_active = true)");
    expect(compact).toContain("alter table public.baby_name_favorites enable row level security");
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(compact).toContain(`for ${operation}`);
    }
    expect(compact.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("does not seed the illustrative names from the design canvas", () => {
    const illustrative = ["aarav", "myra", "vihaan", "anaya", "kabir", "ira", "reyansh", "diya"];
    expect(illustrative.filter((name) => compact.includes(`'${name}'`))).toEqual([]);
  });
});
