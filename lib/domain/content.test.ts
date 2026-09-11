import { describe, expect, it } from "vitest";
import { resolveLocalisedContent } from "@/lib/domain/content";

const en = { slug: "rest", locale: "en" as const, title: "Resting well" };
const hi = { slug: "rest", locale: "hi" as const, title: "आराम करना" };

describe("resolveLocalisedContent", () => {
  it("returns the requested locale when it exists", () => {
    expect(resolveLocalisedContent({ items: [en, hi], locale: "hi" })).toEqual({
      item: hi,
      isFallback: false,
    });
  });

  it("falls back to English and says so, rather than hiding the item", () => {
    expect(resolveLocalisedContent({ items: [en], locale: "hi" })).toEqual({
      item: en,
      isFallback: true,
    });
  });

  it("returns null when neither locale exists", () => {
    expect(resolveLocalisedContent({ items: [], locale: "hi" })).toBeNull();
  });

  it("never falls back from English to Hindi, because English is the base locale", () => {
    expect(resolveLocalisedContent({ items: [hi], locale: "en" })).toBeNull();
  });
});
