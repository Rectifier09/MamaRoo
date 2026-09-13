import { describe, expect, it } from "vitest";
import { adherenceGrid, adherenceRatio, expectedDoses } from "@/lib/domain/adherence";

const daily = {
  id: "m1",
  schedule_times: ["09:00", "21:00"],
  days_of_week: null,
  start_date: "2026-09-08",
  end_date: null,
  is_active: true,
};

describe("expectedDoses", () => {
  it("produces one entry per time per day in range", () => {
    const doses = expectedDoses({ medicine: daily, from: "2026-09-08", to: "2026-09-10" });
    expect(doses).toHaveLength(6);
  });

  it("starts no earlier than the course start date", () => {
    const doses = expectedDoses({ medicine: daily, from: "2026-09-01", to: "2026-09-09" });
    expect(doses[0]!.date).toBe("2026-09-08");
  });

  it("stops at the course end date", () => {
    const doses = expectedDoses({
      medicine: { ...daily, end_date: "2026-09-09" },
      from: "2026-09-08",
      to: "2026-09-12",
    });
    expect(doses.at(-1)!.date).toBe("2026-09-09");
  });

  it("respects a day-of-week restriction", () => {
    // 2026-09-08 is a Tuesday (2) and 2026-09-09 a Wednesday (3).
    const doses = expectedDoses({
      medicine: { ...daily, days_of_week: [2] },
      from: "2026-09-08",
      to: "2026-09-09",
    });
    expect(doses.every((d) => d.date === "2026-09-08")).toBe(true);
  });

  it("returns nothing for an inactive medicine", () => {
    expect(expectedDoses({ medicine: { ...daily, is_active: false }, from: "2026-09-08", to: "2026-09-10" })).toEqual([]);
  });

  it("returns nothing when the range is inverted", () => {
    expect(expectedDoses({ medicine: daily, from: "2026-09-10", to: "2026-09-08" })).toEqual([]);
  });

  it("returns nothing for a medicine with no scheduled times", () => {
    expect(expectedDoses({ medicine: { ...daily, schedule_times: [] }, from: "2026-09-08", to: "2026-09-10" })).toEqual([]);
  });

  it("treats a dose at 00:00 as belonging to that calendar day, not the one before", () => {
    const doses = expectedDoses({
      medicine: { ...daily, schedule_times: ["00:00"] },
      from: "2026-09-08",
      to: "2026-09-08",
    });
    expect(doses).toEqual([{ date: "2026-09-08", time: "00:00" }]);
  });
});

describe("adherenceGrid", () => {
  const logs = [
    { medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "09:00", status: "taken" as const },
    { medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "21:00", status: "skipped" as const },
  ];

  it("returns one cell per day in the range, including days with nothing expected", () => {
    const grid = adherenceGrid({ medicines: [daily], logs, from: "2026-09-07", to: "2026-09-09" });
    expect(grid.map((c) => c.date)).toEqual(["2026-09-07", "2026-09-08", "2026-09-09"]);
    expect(grid[0]).toMatchObject({ expected: 0, taken: 0, skipped: 0, unlogged: 0 });
  });

  it("counts taken, skipped and unlogged separately, because they mean different things", () => {
    const grid = adherenceGrid({ medicines: [daily], logs, from: "2026-09-08", to: "2026-09-09" });
    expect(grid[0]).toMatchObject({ expected: 2, taken: 1, skipped: 1, unlogged: 0 });
    expect(grid[1]).toMatchObject({ expected: 2, taken: 0, skipped: 0, unlogged: 2 });
  });

  it("matches a log time stored with seconds", () => {
    const withSeconds = [{ ...logs[0]!, scheduled_time: "09:00:00" }];
    const grid = adherenceGrid({ medicines: [daily], logs: withSeconds, from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]!.taken).toBe(1);
  });

  it("ignores a log with no matching expected dose, rather than inflating the count", () => {
    const orphan = [{ medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "13:00", status: "taken" as const }];
    const grid = adherenceGrid({ medicines: [daily], logs: orphan, from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]).toMatchObject({ expected: 2, taken: 0, unlogged: 2 });
  });

  it("aggregates across several medicines", () => {
    const second = { ...daily, id: "m2", schedule_times: ["12:00"] };
    const grid = adherenceGrid({ medicines: [daily, second], logs: [], from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]!.expected).toBe(3);
  });

  it("handles two medicines sharing a name without mixing their logs", () => {
    const twin = { ...daily, id: "m2" };
    const onlyFirst = [{ medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "09:00", status: "taken" as const }];
    const grid = adherenceGrid({ medicines: [daily, twin], logs: onlyFirst, from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]).toMatchObject({ expected: 4, taken: 1, unlogged: 3 });
  });
});

describe("adherenceRatio", () => {
  it("reports taken out of expected", () => {
    const grid = adherenceGrid({
      medicines: [daily],
      logs: [{ medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "09:00", status: "taken" }],
      from: "2026-09-08",
      to: "2026-09-08",
    });
    expect(adherenceRatio(grid)).toEqual({ taken: 1, expected: 2 });
  });

  it("reports zero out of zero rather than dividing by zero", () => {
    expect(adherenceRatio([])).toEqual({ taken: 0, expected: 0 });
  });
});
