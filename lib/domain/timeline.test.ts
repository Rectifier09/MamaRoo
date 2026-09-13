import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/domain/timeline";

const events = [
  { id: "e1", event_type: "kick_session" as const, occurred_at: "2026-09-10T10:00:00Z", title: "10 kicks counted", body: null, source: "user" as const },
  { id: "e2", event_type: "report" as const, occurred_at: "2026-08-20T10:00:00Z", title: "Scan report added", body: null, source: "user" as const },
];

const milestones = [
  { stage: 1, week: 0, titleKey: "milestones.1" },
  { stage: 2, week: 8, titleKey: "milestones.2" },
  { stage: 3, week: 12, titleKey: "milestones.3" },
];

const context = { lmp: "2026-03-01", currentWeek: 14 };

describe("buildTimeline", () => {
  it("returns her own events newest first", () => {
    const entries = buildTimeline({ events, milestones: [], ...context });
    expect(entries.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("includes only milestones she has already reached", () => {
    const entries = buildTimeline({ events: [], milestones, ...context });
    expect(entries).toHaveLength(3);
    expect(buildTimeline({ events: [], milestones, lmp: "2026-03-01", currentWeek: 9 })).toHaveLength(2);
  });

  it("never includes a future milestone, because the timeline is a record, not a forecast", () => {
    const entries = buildTimeline({ events: [], milestones, lmp: "2026-03-01", currentWeek: 5 });
    expect(entries.every((e) => e.kind === "milestone" && e.week <= 5)).toBe(true);
  });

  it("interleaves milestones and events in one reverse-chronological list", () => {
    const entries = buildTimeline({ events, milestones, ...context });
    const times = entries.map((e) => new Date(e.occurredAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("dates a milestone from the last menstrual period, so it sits correctly in the order", () => {
    const entries = buildTimeline({ events: [], milestones: [milestones[1]!], ...context });
    // Week 8 after an LMP of 2026-03-01 is 2026-04-26.
    expect(entries[0]!.occurredAt.slice(0, 10)).toBe("2026-04-26");
  });

  it("marks which entries are hers and which are ours", () => {
    const entries = buildTimeline({ events, milestones, ...context });
    expect(entries.some((e) => e.kind === "event")).toBe(true);
    expect(entries.some((e) => e.kind === "milestone")).toBe(true);
  });

  it("returns an empty list when there is nothing at all", () => {
    expect(buildTimeline({ events: [], milestones: [], lmp: "2026-03-01", currentWeek: 0 })).toEqual([]);
  });

  it("falls back to dating milestones from the due date when no last period is known", () => {
    const entries = buildTimeline({ events: [], milestones: [milestones[1]!], edd: "2026-12-06", currentWeek: 14 });
    expect(entries[0]!.occurredAt.slice(0, 10)).toBe("2026-04-26");
  });

  it("keeps a stable order for two entries at the same moment", () => {
    const same = [
      { ...events[0]!, id: "a", occurred_at: "2026-09-10T10:00:00Z" },
      { ...events[0]!, id: "b", occurred_at: "2026-09-10T10:00:00Z" },
    ];
    expect(buildTimeline({ events: same, milestones: [], ...context }).map((e) => e.id)).toEqual(["a", "b"]);
  });
});
