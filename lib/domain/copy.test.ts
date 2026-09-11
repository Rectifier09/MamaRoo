import { describe, expect, it } from "vitest";
import { validateCopy } from "@/lib/domain/copy";

describe("validateCopy", () => {
  it("accepts plain, calm copy", () => {
    expect(validateCopy("You are in week 24. Your baby is about the size of a corn cob.")).toEqual([]);
  });

  it("rejects an em dash", () => {
    expect(validateCopy("Week 24 — your baby is growing")).toContain("em-dash");
  });

  it("rejects the not-just-X-it's-Y construction", () => {
    expect(validateCopy("It's not just a tracker, it's a companion")).toContain("not-just-construction");
  });

  it.each(["unlock", "empower", "seamless", "elevate", "dive into", "harness", "leverage"])(
    "rejects the banned word %s",
    (word) => {
      expect(validateCopy(`We ${word} your pregnancy journey`)).toContain(`banned-word:${word}`);
    },
  );

  it("is case insensitive about banned words", () => {
    expect(validateCopy("Seamless experience")).toContain("banned-word:seamless");
  });

  it("does not flag a banned word occurring inside another word", () => {
    expect(validateCopy("Elevated blood pressure needs a check")).toEqual([]);
  });

  it("reports every violation in one string, not just the first", () => {
    expect(validateCopy("Unlock a seamless week — really")).toHaveLength(3);
  });
});
