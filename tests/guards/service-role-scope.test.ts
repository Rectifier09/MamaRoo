import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Only the anon key may appear in app/, components/ or lib/. The service-role key
// bypasses RLS entirely, so it is used by exactly one code path (account deletion,
// added later) and otherwise must never reach the client bundle or ordinary server code.
describe("service-role key stays out of the application bundle", () => {
  it("appears in no file under app/, components/ or lib/", () => {
    const hits = execSync(
      "grep -rn \"SUPABASE_SERVICE_ROLE_KEY\" app components lib " +
        "--include='*.ts' --include='*.tsx' 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });
});
