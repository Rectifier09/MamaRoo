import { describe, expect, it } from "vitest";
import { buildReminders } from "@/lib/domain/reminders";

const today = "2026-09-11";
const now = new Date("2026-09-11T14:00:00+05:30").getTime();

const medicine = {
  id: "m1",
  name: "Folic acid",
  schedule_times: ["09:00", "21:00"],
  days_of_week: null,
  start_date: "2026-09-01",
  end_date: null,
  is_active: true,
};

describe("buildReminders", () => {
  it("returns nothing when there is nothing due", () => {
    expect(buildReminders({ today, now, appointments: [], medicines: [], logs: [] })).toEqual([]);
  });

  it("includes the next upcoming appointment", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [
        { id: "a1", title: "Scan", scheduled_at: "2026-09-14T10:00:00+05:30", status: "upcoming" },
      ],
      medicines: [],
      logs: [],
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ kind: "appointment", refId: "a1", daysAhead: 3 });
  });

  it("includes only the nearest upcoming appointment, keeping the screen calm", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [
        { id: "a2", title: "Later", scheduled_at: "2026-10-01T10:00:00+05:30", status: "upcoming" },
        { id: "a1", title: "Sooner", scheduled_at: "2026-09-14T10:00:00+05:30", status: "upcoming" },
      ],
      medicines: [],
      logs: [],
    });
    expect(reminders.filter((r) => r.kind === "appointment")).toHaveLength(1);
    expect(reminders[0]!.refId).toBe("a1");
  });

  it("ignores a cancelled appointment", () => {
    expect(
      buildReminders({
        today,
        now,
        appointments: [
          { id: "a1", title: "Scan", scheduled_at: "2026-09-14T10:00:00+05:30", status: "cancelled" },
        ],
        medicines: [],
        logs: [],
      }),
    ).toEqual([]);
  });

  it("ignores an appointment already in the past", () => {
    expect(
      buildReminders({
        today,
        now,
        appointments: [
          { id: "a1", title: "Scan", scheduled_at: "2026-09-01T10:00:00+05:30", status: "upcoming" },
        ],
        medicines: [],
        logs: [],
      }),
    ).toEqual([]);
  });

  it("includes a dose already due today and not yet logged", () => {
    const reminders = buildReminders({ today, now, appointments: [], medicines: [medicine], logs: [] });
    const doses = reminders.filter((r) => r.kind === "dose");
    expect(doses).toHaveLength(1);
    expect(doses[0]).toMatchObject({ refId: "m1", scheduledTime: "09:00", isOverdue: true });
  });

  it("excludes a dose later today when an overdue dose already exists", () => {
    const reminders = buildReminders({ today, now, appointments: [], medicines: [medicine], logs: [] });
    expect(reminders.some((r) => r.kind === "dose" && r.scheduledTime === "21:00")).toBe(false);
  });

  // Session 33 follow-up: Today used to say "nothing due" all day until the
  // first dose was actually late, which read as reminders simply not
  // working. A not-yet-due dose is now shown as a fallback, but only when
  // nothing is genuinely overdue -- overdue still takes priority (previous
  // test), so this never buries something that actually needs attention.
  it("includes the next upcoming dose today when nothing is overdue", () => {
    const eveningOnly = { ...medicine, schedule_times: ["21:00"] };
    const reminders = buildReminders({ today, now, appointments: [], medicines: [eveningOnly], logs: [] });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ kind: "dose", refId: "m1", scheduledTime: "21:00", isOverdue: false });
  });

  it("puts an upcoming dose before the appointment when nothing is overdue", () => {
    const eveningOnly = { ...medicine, schedule_times: ["21:00"] };
    const reminders = buildReminders({
      today,
      now,
      appointments: [
        { id: "a1", title: "Scan", scheduled_at: "2026-09-14T10:00:00+05:30", status: "upcoming" },
      ],
      medicines: [eveningOnly],
      logs: [],
    });
    expect(reminders[0]).toMatchObject({ kind: "dose", isOverdue: false });
  });

  it("excludes a dose already logged", () => {
    const morningOnly = { ...medicine, schedule_times: ["09:00"] };
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [morningOnly],
      logs: [{ medicine_id: "m1", scheduled_date: today, scheduled_time: "09:00", status: "taken" }],
    });
    expect(reminders.filter((r) => r.kind === "dose")).toEqual([]);
  });

  it("treats a skipped dose as handled, not as outstanding", () => {
    const morningOnly = { ...medicine, schedule_times: ["09:00"] };
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [morningOnly],
      logs: [{ medicine_id: "m1", scheduled_date: today, scheduled_time: "09:00", status: "skipped" }],
    });
    expect(reminders.filter((r) => r.kind === "dose")).toEqual([]);
  });

  it("excludes an inactive medicine", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [{ ...medicine, is_active: false }],
      logs: [],
    });
    expect(reminders).toEqual([]);
  });

  it("excludes a medicine whose course has ended", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [{ ...medicine, end_date: "2026-09-10" }],
      logs: [],
    });
    expect(reminders).toEqual([]);
  });

  it("excludes a medicine whose course has not started", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [{ ...medicine, start_date: "2026-09-20" }],
      logs: [],
    });
    expect(reminders).toEqual([]);
  });

  it("respects a day-of-week restriction", () => {
    // 2026-09-11 is a Friday, which is day 5.
    const fridayOnly = { ...medicine, days_of_week: [5] };
    const mondayOnly = { ...medicine, days_of_week: [1] };
    expect(
      buildReminders({ today, now, appointments: [], medicines: [fridayOnly], logs: [] }).length,
    ).toBeGreaterThan(0);
    expect(buildReminders({ today, now, appointments: [], medicines: [mondayOnly], logs: [] })).toEqual([]);
  });

  it("puts overdue doses before the upcoming appointment", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [
        { id: "a1", title: "Scan", scheduled_at: "2026-09-14T10:00:00+05:30", status: "upcoming" },
      ],
      medicines: [medicine],
      logs: [],
    });
    expect(reminders[0]!.kind).toBe("dose");
  });
});
