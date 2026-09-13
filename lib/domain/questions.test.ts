import { describe, expect, it } from "vitest";
import { selectQuestions, validateQuestionBody } from "@/lib/domain/questions";

describe("validateQuestionBody", () => {
  it("trims the outside while preserving internal formatting", () => {
    expect(validateQuestionBody("  Can I keep travelling?  ")).toEqual({
      ok: true,
      value: "Can I keep travelling?",
    });
  });

  it("returns field errors for blank, overlong, and malformed values", () => {
    expect(validateQuestionBody("   ")).toEqual({ ok: false, error: "empty" });
    expect(validateQuestionBody("x".repeat(501))).toEqual({ ok: false, error: "too_long" });
    expect(validateQuestionBody(undefined)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("selectQuestions", () => {
  it("orders seeded questions by priority ahead of her own, oldest custom first", () => {
    const result = selectQuestions({
      suggested: [
        { id: "s2", body: "Second seeded", priority: 200 },
        { id: "s1", body: "First seeded", priority: 100 },
      ],
      custom: [
        { id: "c2", body: "Newer custom", is_marked: false, created_at: "2026-09-02T00:00:00Z" },
        { id: "c1", body: "Older custom", is_marked: false, created_at: "2026-09-01T00:00:00Z" },
      ],
      markedSuggestedIds: new Set(),
    });

    expect(result.map((q) => q.id)).toEqual(["s1", "s2", "c1", "c2"]);
  });

  it("tags each record with its kind and never lets a suggested row claim custom status", () => {
    const result = selectQuestions({
      suggested: [{ id: "s1", body: "Seeded", priority: 100 }],
      custom: [{ id: "c1", body: "Mine", is_marked: true, created_at: "2026-09-01T00:00:00Z" }],
      markedSuggestedIds: new Set(),
    });

    expect(result.find((q) => q.id === "s1")).toMatchObject({ kind: "suggested", createdAt: null });
    expect(result.find((q) => q.id === "c1")).toMatchObject({ kind: "custom", createdAt: "2026-09-01T00:00:00Z" });
  });

  it("marks a suggested question only when its id is in the marked set", () => {
    const result = selectQuestions({
      suggested: [
        { id: "s1", body: "Marked", priority: 100 },
        { id: "s2", body: "Unmarked", priority: 200 },
      ],
      custom: [],
      markedSuggestedIds: new Set(["s1"]),
    });

    expect(result.find((q) => q.id === "s1")?.marked).toBe(true);
    expect(result.find((q) => q.id === "s2")?.marked).toBe(false);
  });

  it("reads a custom question's mark straight off its own row", () => {
    const result = selectQuestions({
      suggested: [],
      custom: [{ id: "c1", body: "Mine", is_marked: true, created_at: "2026-09-01T00:00:00Z" }],
      markedSuggestedIds: new Set(),
    });

    expect(result[0]!.marked).toBe(true);
  });

  it("returns an empty list when nothing seeded and nothing custom exists yet", () => {
    expect(selectQuestions({ suggested: [], custom: [], markedSuggestedIds: new Set() })).toEqual([]);
  });
});
