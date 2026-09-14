import { describe, expect, it } from "vitest";
import { buildActivityFeed, groupActivityByDay } from "@/lib/domain/activity";

const now = new Date("2026-09-11T18:00:00+05:30").getTime();

describe("buildActivityFeed", () => {
  it("returns nothing when there is nothing to show", () => {
    expect(
      buildActivityFeed({ checkins: [], medicineLogs: [], milestones: [], appointments: [], wellnessEvents: [], now }),
    ).toEqual([]);
  });

  it("turns a checkin with a feeling into a mood entry of the matching kind", () => {
    const entries = buildActivityFeed({
      checkins: [{ id: "c1", feeling: "good", created_at: "2026-09-11T10:00:00+05:30", body: null }],
      medicineLogs: [],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    expect(entries).toEqual([
      { id: "c1", kind: "moodGood", occurredAt: "2026-09-11T10:00:00+05:30", params: { body: "" } },
    ]);
  });

  it("maps each feeling to its own kind", () => {
    const entries = buildActivityFeed({
      checkins: [
        { id: "c1", feeling: "new", created_at: "2026-09-11T10:00:00+05:30", body: null },
        { id: "c2", feeling: "worried", created_at: "2026-09-11T11:00:00+05:30", body: null },
      ],
      medicineLogs: [],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    expect(entries.find((e) => e.id === "c1")!.kind).toBe("moodNew");
    expect(entries.find((e) => e.id === "c2")!.kind).toBe("moodWorried");
  });

  it("falls back to a neutral mood kind when she typed without tapping a chip", () => {
    const entries = buildActivityFeed({
      checkins: [{ id: "c1", feeling: null, created_at: "2026-09-11T10:00:00+05:30", body: null }],
      medicineLogs: [],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    expect(entries[0]!.kind).toBe("moodNew");
  });

  // Session 33 follow-up: the activity feed used to deliberately drop this
  // field so the list row could only ever show fixed mood copy. The row
  // still shows that fixed copy (next test file over) -- what changed is
  // that the raw text is now carried through at all, for a detail view to
  // show on tap, rather than being discarded before it reaches the UI layer.
  it("carries the checkin's free-text body through as params.body", () => {
    const entries = buildActivityFeed({
      checkins: [
        { id: "c1", feeling: "worried", created_at: "2026-09-11T10:00:00+05:30", body: "A private symptom" },
      ],
      medicineLogs: [],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    expect(entries[0]!.params.body).toBe("A private symptom");
  });

  it("represents no free text as an empty string, not null or undefined", () => {
    const entries = buildActivityFeed({
      checkins: [{ id: "c1", feeling: "good", created_at: "2026-09-11T10:00:00+05:30", body: null }],
      medicineLogs: [],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    expect(entries[0]!.params.body).toBe("");
  });

  it("turns a medicine log into a medicine entry carrying the medicine's name", () => {
    const entries = buildActivityFeed({
      checkins: [],
      medicineLogs: [
        { id: "l1", medicine_name: "Iron tablet", status: "taken", logged_at: "2026-09-11T09:05:00+05:30" },
      ],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    expect(entries[0]).toMatchObject({ kind: "medicineTaken", params: { medicineName: "Iron tablet" } });
  });

  it("distinguishes a skipped dose from a taken one", () => {
    const entries = buildActivityFeed({
      checkins: [],
      medicineLogs: [{ id: "l1", medicine_name: "Iron tablet", status: "skipped", logged_at: "2026-09-11T09:05:00+05:30" }],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    expect(entries[0]!.kind).toBe("medicineSkipped");
  });

  it("merges every kind into one reverse-chronological list", () => {
    const entries = buildActivityFeed({
      checkins: [{ id: "c1", feeling: "good", created_at: "2026-09-11T10:00:00+05:30", body: null }],
      medicineLogs: [{ id: "l1", medicine_name: "Iron tablet", status: "taken", logged_at: "2026-09-11T09:00:00+05:30" }],
      milestones: [],
      appointments: [],
      wellnessEvents: [],
      now,
    });
    const times = entries.map((e) => new Date(e.occurredAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("accepts empty milestone, appointment and wellness arrays without complaint, because their producers don't exist yet", () => {
    expect(() =>
      buildActivityFeed({ checkins: [], medicineLogs: [], milestones: [], appointments: [], wellnessEvents: [], now }),
    ).not.toThrow();
  });

  it("merges milestones, appointments and wellness events once their arrays carry data", () => {
    const entries = buildActivityFeed({
      checkins: [],
      medicineLogs: [],
      milestones: [{ id: "ms1", titleKey: "milestones.4", occurred_at: "2026-09-08T00:00:00+05:30" }],
      appointments: [{ id: "ap1", title: "Scan", occurred_at: "2026-09-06T10:00:00+05:30" }],
      wellnessEvents: [{ id: "w1", label: "Evening walk", occurred_at: "2026-09-10T19:00:00+05:30" }],
      now,
    });
    expect(entries.map((e) => e.kind)).toEqual(["wellness", "milestone", "appointment"]);
  });
});

describe("groupActivityByDay", () => {
  it("labels today, yesterday and this week distinctly", () => {
    const entries = [
      { id: "a", kind: "moodGood" as const, occurredAt: "2026-09-11T10:00:00+05:30", params: {} },
      { id: "b", kind: "moodGood" as const, occurredAt: "2026-09-10T10:00:00+05:30", params: {} },
      { id: "c", kind: "moodGood" as const, occurredAt: "2026-09-06T10:00:00+05:30", params: {} },
    ];
    const groups = groupActivityByDay({ entries, today: "2026-09-11" });
    expect(groups.map((g) => g.labelKey)).toEqual(["activity.today", "activity.yesterday", "activity.thisWeek"]);
  });

  it("returns no groups for an empty feed, so the screen can show its own empty state", () => {
    expect(groupActivityByDay({ entries: [], today: "2026-09-11" })).toEqual([]);
  });

  it("buckets an entry older than a week as earlier", () => {
    const entries = [{ id: "a", kind: "moodGood" as const, occurredAt: "2026-08-01T10:00:00+05:30", params: {} }];
    const groups = groupActivityByDay({ entries, today: "2026-09-11" });
    expect(groups).toEqual([{ labelKey: "activity.earlier", entries }]);
  });
});
