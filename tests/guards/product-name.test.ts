import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { PRODUCT_NAME, SUPPORTED_LOCALES } from "@/lib/config";

describe("product configuration", () => {
  it("exposes the product name as a single constant", () => {
    expect(PRODUCT_NAME).toBe("MamaRoo");
  });

  it("supports exactly English and Hindi", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "hi"]);
  });

  it("never hardcodes the product name outside lib/config.ts", () => {
    // grep returns exit code 1 (and empty stdout) when nothing matches, which is the pass case.
    const hits = execSync(
      "grep -rn 'MamaRoo' app components lib i18n public android 2>/dev/null " +
        "| grep -v 'lib/config.ts' " +
        "|| true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });
});
