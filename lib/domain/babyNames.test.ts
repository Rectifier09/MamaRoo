import { describe, expect, it } from "vitest";
import {
  babyNameDetail,
  chooseBabyName,
  searchBabyNames,
  toggleFavoriteId,
  validateBabyNames,
  type BabyNameOption,
} from "@/lib/domain/babyNames";

const names: BabyNameOption[] = [
  { id: "n1", name: "Aditi", meaning: "Boundless" },
  { id: "n2", name: "Noor", meaning: "Light" },
  { id: "n3", name: "तारा", meaning: "सितारा" },
];

describe("searchBabyNames", () => {
  it("returns every suggestion for an empty query", () => {
    expect(searchBabyNames(names, "   ")).toEqual(names);
  });

  it("matches names and localized meanings without case sensitivity", () => {
    expect(searchBabyNames(names, "NOO").map((item) => item.id)).toEqual(["n2"]);
    expect(searchBabyNames(names, "bound").map((item) => item.id)).toEqual(["n1"]);
  });

  it("matches Devanagari text and returns no false result", () => {
    expect(searchBabyNames(names, "सितारा").map((item) => item.id)).toEqual(["n3"]);
    expect(searchBabyNames(names, "missing")).toEqual([]);
  });
});

describe("babyNameDetail", () => {
  it("returns the selected catalog entry and null for an unknown id", () => {
    expect(babyNameDetail(names, "n2")).toEqual(names[1]);
    expect(babyNameDetail(names, "unknown")).toBeNull();
  });
});

describe("toggleFavoriteId", () => {
  it("adds once and removes an existing favorite", () => {
    expect(toggleFavoriteId(["n1"], "n2")).toEqual(["n1", "n2"]);
    expect(toggleFavoriteId(["n1", "n2"], "n1")).toEqual(["n2"]);
    expect(toggleFavoriteId(["n1", "n1"], "n2")).toEqual(["n1", "n2"]);
  });
});

describe("validateBabyNames", () => {
  it("accepts an empty array and trims Latin and Devanagari names", () => {
    expect(validateBabyNames({ names: [], babyCount: 1 })).toEqual({ ok: true, value: [] });
    expect(validateBabyNames({ names: ["  Aditi  ", "  तारा  "], babyCount: 2 })).toEqual({
      ok: true,
      value: ["Aditi", "तारा"],
    });
  });

  it("rejects blank, overlong, duplicate, malformed, and over-capacity input", () => {
    expect(validateBabyNames({ names: ["   "], babyCount: 1 })).toEqual({ ok: false, error: "empty" });
    expect(validateBabyNames({ names: ["a".repeat(61)], babyCount: 1 })).toEqual({ ok: false, error: "too_long" });
    expect(validateBabyNames({ names: ["Noor", " noor "], babyCount: 2 })).toEqual({ ok: false, error: "duplicate" });
    expect(validateBabyNames({ names: ["Aditi", "Noor"], babyCount: 1 })).toEqual({ ok: false, error: "too_many" });
    expect(validateBabyNames({ names: "Aditi" as unknown as string[], babyCount: 1 })).toEqual({ ok: false, error: "invalid" });
  });
});

describe("chooseBabyName", () => {
  it("replaces the singleton choice but appends a second twin name", () => {
    expect(chooseBabyName({ current: ["Aditi"], name: "Noor", babyCount: 1 })).toEqual({ ok: true, value: ["Noor"] });
    expect(chooseBabyName({ current: ["Aditi"], name: "Noor", babyCount: 2 })).toEqual({ ok: true, value: ["Aditi", "Noor"] });
  });

  it("does not duplicate a chosen name and refuses a third twin name", () => {
    expect(chooseBabyName({ current: ["Aditi"], name: " aditi ", babyCount: 2 })).toEqual({ ok: true, value: ["Aditi"] });
    expect(chooseBabyName({ current: ["Aditi", "Noor"], name: "Tara", babyCount: 2 })).toEqual({ ok: false, error: "too_many" });
  });
});
