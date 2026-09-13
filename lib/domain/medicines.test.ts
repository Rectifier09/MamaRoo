import { describe, expect, it } from "vitest";
import { buildMedicineListItems, isPriorityMedicine, validateMedicine } from "@/lib/domain/medicines";

const base = {
  name: "Vitamin D3",
  scheduleTimes: ["09:00"],
  startDate: "2026-09-08",
};

describe("validateMedicine", () => {
  it("requires a name", () => {
    const result = validateMedicine({ ...base, name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBeDefined();
  });

  it("trims the name", () => {
    const result = validateMedicine({ ...base, name: "  Vitamin D3  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Vitamin D3");
  });

  it("requires at least one scheduled time", () => {
    const result = validateMedicine({ ...base, scheduleTimes: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.scheduleTimes).toBeDefined();
  });

  it("rejects more than six times", () => {
    const result = validateMedicine({
      ...base,
      scheduleTimes: ["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.scheduleTimes).toBeDefined();
  });

  it("rejects a malformed time", () => {
    const result = validateMedicine({ ...base, scheduleTimes: ["9 PM"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.scheduleTimes).toBeDefined();
  });

  it("collapses duplicate times rather than rejecting them", () => {
    const result = validateMedicine({ ...base, scheduleTimes: ["09:00", "09:00", "21:00"] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.scheduleTimes).toEqual(["09:00", "21:00"]);
  });

  it("rejects an end date before the start date", () => {
    const result = validateMedicine({ ...base, startDate: "2026-09-10", endDate: "2026-09-08" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.endDate).toBeDefined();
  });

  it("accepts an end date on or after the start date", () => {
    const result = validateMedicine({ ...base, startDate: "2026-09-08", endDate: "2026-09-08" });
    expect(result.ok).toBe(true);
  });

  it("rejects a day-of-week value outside 1 to 7", () => {
    const result = validateMedicine({ ...base, daysOfWeek: [0, 3] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.daysOfWeek).toBeDefined();
  });

  it("accepts valid days of the week", () => {
    const result = validateMedicine({ ...base, daysOfWeek: [1, 7] });
    expect(result.ok).toBe(true);
  });

  it("flags a duplicate name against an existing active medicine as a warning, not an error", () => {
    const result = validateMedicine({ ...base, existingActiveNames: ["Vitamin D3"] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings.name).toBeDefined();
  });

  it("does not warn when the name doesn't match any existing active medicine", () => {
    const result = validateMedicine({ ...base, existingActiveNames: ["Iron"] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings.name).toBeUndefined();
  });

  it("matches an existing name case-insensitively after trimming", () => {
    const result = validateMedicine({ ...base, name: " vitamin d3 ", existingActiveNames: ["Vitamin D3"] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings.name).toBeDefined();
  });
});

describe("isPriorityMedicine", () => {
  // No schema column backs this -- iron and calcium supplements are pinned to
  // the always-visible tracker by name, so the pin works the moment she adds
  // one, with no migration and nothing for her to configure.
  it("flags an iron or folic acid supplement", () => {
    expect(isPriorityMedicine("Iron and folic acid")).toBe(true);
    expect(isPriorityMedicine("Folic Acid")).toBe(true);
  });

  it("flags a calcium supplement", () => {
    expect(isPriorityMedicine("Calcium")).toBe(true);
    expect(isPriorityMedicine("Calcium carbonate")).toBe(true);
  });

  it("does not flag an unrelated medicine", () => {
    expect(isPriorityMedicine("Vitamin D3")).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(isPriorityMedicine("IRON TABLET")).toBe(true);
  });
});

describe("buildMedicineListItems", () => {
  const medicine = {
    id: "m1",
    name: "Vitamin D3",
    dosage: "1 capsule",
    schedule_times: ["09:00"],
    days_of_week: null,
    start_date: "2026-09-01",
    end_date: null,
    is_active: true,
  };

  it("marks a dose pending with no log", () => {
    const [item] = buildMedicineListItems({ medicines: [medicine], logs: [], today: "2026-09-12" });
    expect(item).toMatchObject({ id: "m1", status: "pending", nextPendingTime: "09:00", todayTimes: ["09:00"] });
  });

  it("marks a dose taken once logged", () => {
    const logs = [{ medicine_id: "m1", scheduled_date: "2026-09-12", scheduled_time: "09:00", status: "taken" as const }];
    const [item] = buildMedicineListItems({ medicines: [medicine], logs, today: "2026-09-12" });
    expect(item).toMatchObject({ status: "taken", nextPendingTime: null });
  });

  it("marks a dose skipped once logged", () => {
    const logs = [{ medicine_id: "m1", scheduled_date: "2026-09-12", scheduled_time: "09:00", status: "skipped" as const }];
    const [item] = buildMedicineListItems({ medicines: [medicine], logs, today: "2026-09-12" });
    expect(item).toMatchObject({ status: "skipped", nextPendingTime: null });
  });

  it("stays pending when only some of several doses are logged", () => {
    const twiceDaily = { ...medicine, schedule_times: ["09:00", "21:00"] };
    const logs = [{ medicine_id: "m1", scheduled_date: "2026-09-12", scheduled_time: "09:00", status: "taken" as const }];
    const [item] = buildMedicineListItems({ medicines: [twiceDaily], logs, today: "2026-09-12" });
    expect(item).toMatchObject({ status: "pending", nextPendingTime: "21:00" });
  });

  it("flags a priority medicine by name", () => {
    const [item] = buildMedicineListItems({
      medicines: [{ ...medicine, name: "Iron and folic acid" }],
      logs: [],
      today: "2026-09-12",
    });
    expect(item).toMatchObject({ isPriority: true });
  });
});
