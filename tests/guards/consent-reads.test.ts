import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("consent reads route through the shared query", () => {
  it("routes every current-consent read through the shared query", () => {
    const hits = execSync(
      "grep -rn \"current_consents\\|from(\\\"consents\\\")\" app components lib middleware.ts " +
        "--include='*.ts' --include='*.tsx' 2>/dev/null " +
        "| grep -v 'lib/supabase/queries/consent.ts' " +
        "| grep -v 'app/actions/consent.ts' " +
        // The generated Database type legitimately names the view as a type key.
        // It is not a "read" and is never hand-edited, so it is excluded here too.
        "| grep -v 'lib/supabase/database.types.ts' || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });
});
