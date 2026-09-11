import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import { validateCopy } from "@/lib/domain/copy";

function strings(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  if (typeof obj !== "object" || obj === null) return [];
  return Object.entries(obj).flatMap(([k, v]) => strings(v, prefix ? `${prefix}.${k}` : k));
}

describe("copy rules (design document §9)", () => {
  for (const [locale, catalogue] of [["en", en], ["hi", hi]] as const) {
    it(`passes every voice rule in ${locale}`, () => {
      const offences = strings(catalogue)
        .map(([key, value]) => [key, validateCopy(value)] as const)
        .filter(([, v]) => v.length > 0)
        .map(([key, v]) => `${locale}:${key} -> ${v.join(", ")}`);
      expect(offences).toEqual([]);
    });
  }
});
