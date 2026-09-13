import { describe, expect, it } from "vitest";
import { notePreview, sortNotesByRecency, validateNoteBody, type NoteRecord } from "@/lib/domain/notes";

describe("notePreview", () => {
  it("collapses newlines and repeated whitespace into a single line", () => {
    expect(notePreview("Felt the first  proper kick today.\nIt was such a special moment."))
      .toBe("Felt the first proper kick today. It was such a special moment.");
  });

  it("truncates a long note without exceeding the requested length", () => {
    const preview = notePreview("A".repeat(120), 48);
    expect(preview).toHaveLength(48);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("leaves a short note untouched", () => {
    expect(notePreview("Bit tired this week")).toBe("Bit tired this week");
  });
});

describe("validateNoteBody", () => {
  it("trims the outside while preserving internal formatting", () => {
    expect(validateNoteBody("  Names we both liked from the list  ")).toEqual({
      ok: true,
      value: "Names we both liked from the list",
    });
  });

  it("returns field errors for blank, overlong, and malformed values", () => {
    expect(validateNoteBody("   ")).toEqual({ ok: false, error: "empty" });
    expect(validateNoteBody("x".repeat(4001))).toEqual({ ok: false, error: "too_long" });
    expect(validateNoteBody(null)).toEqual({ ok: false, error: "invalid" });
  });

  it("accepts Devanagari text at the exact length boundary", () => {
    expect(validateNoteBody("क".repeat(4000))).toEqual({
      ok: true,
      value: "क".repeat(4000),
    });
  });
});

describe("sortNotesByRecency", () => {
  it("orders notes newest first without mutating the input array", () => {
    const notes: NoteRecord[] = [
      { id: "1", body: "oldest", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" },
      { id: "2", body: "newest", createdAt: "2026-09-10T00:00:00Z", updatedAt: "2026-09-10T00:00:00Z" },
      { id: "3", body: "middle", createdAt: "2026-09-05T00:00:00Z", updatedAt: "2026-09-05T00:00:00Z" },
    ];
    const sorted = sortNotesByRecency(notes);
    expect(sorted.map((n) => n.id)).toEqual(["2", "3", "1"]);
    expect(notes.map((n) => n.id)).toEqual(["1", "2", "3"]);
  });
});
