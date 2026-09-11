import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

function flatten(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
}

const enKeys = flatten(en).sort();
const hiKeys = flatten(hi).sort();

describe("message catalogue parity", () => {
  it("has no key present in English but missing in Hindi", () => {
    expect(enKeys.filter((k) => !hiKeys.includes(k))).toEqual([]);
  });

  it("has no key present in Hindi but missing in English", () => {
    expect(hiKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("has no empty string value in either language", () => {
    const empties: string[] = [];
    const walk = (obj: unknown, locale: string, prefix = "") => {
      if (typeof obj === "string") {
        if (obj.trim() === "") empties.push(`${locale}:${prefix}`);
        return;
      }
      if (typeof obj === "object" && obj !== null) {
        for (const [k, v] of Object.entries(obj)) walk(v, locale, prefix ? `${prefix}.${k}` : k);
      }
    };
    walk(en, "en");
    walk(hi, "hi");
    expect(empties).toEqual([]);
  });
});
