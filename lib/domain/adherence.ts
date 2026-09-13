import { addDays, diffDays } from "@/lib/domain/dates";

export interface AdherenceMedicine {
  id: string;
  schedule_times: string[];
  days_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface AdherenceLog {
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "taken" | "skipped";
}

export interface ExpectedDose {
  date: string;
  time: string;
}

export interface AdherenceCell {
  date: string;
  expected: number;
  taken: number;
  skipped: number;
  unlogged: number;
}

/** Normalises a time to `HH:MM`, dropping any trailing `:SS` the database adds. */
function normaliseTime(time: string): string {
  return time.slice(0, 5);
}

/** ISO weekday, 1 (Monday) to 7 (Sunday), matching `days_of_week`'s convention. */
function isoWeekday(date: string): number {
  const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 (Sun) .. 6 (Sat)
  return jsDay === 0 ? 7 : jsDay;
}

/** Every dose a medicine is expected to produce within [from, to], inclusive. */
export function expectedDoses({
  medicine,
  from,
  to,
}: {
  medicine: AdherenceMedicine;
  from: string;
  to: string;
}): ExpectedDose[] {
  if (!medicine.is_active) return [];
  if (medicine.schedule_times.length === 0) return [];
  if (diffDays(from, to) < 0) return [];

  const rangeStart = diffDays(from, medicine.start_date) > 0 ? medicine.start_date : from;
  const rangeEnd = medicine.end_date && diffDays(medicine.end_date, to) > 0 ? medicine.end_date : to;
  if (diffDays(rangeStart, rangeEnd) < 0) return [];

  const doses: ExpectedDose[] = [];
  const days = diffDays(rangeStart, rangeEnd);
  for (let i = 0; i <= days; i++) {
    const date = addDays(rangeStart, i);
    if (medicine.days_of_week && !medicine.days_of_week.includes(isoWeekday(date))) continue;
    for (const time of medicine.schedule_times) {
      doses.push({ date, time: normaliseTime(time) });
    }
  }
  return doses;
}

/** One cell per calendar day in [from, to], aggregating every medicine's expected
 * and logged doses. A day with nothing expected still gets a cell, all zero. */
export function adherenceGrid({
  medicines,
  logs,
  from,
  to,
}: {
  medicines: AdherenceMedicine[];
  logs: AdherenceLog[];
  from: string;
  to: string;
}): AdherenceCell[] {
  const logsByKey = new Map<string, AdherenceLog>();
  for (const log of logs) {
    logsByKey.set(`${log.medicine_id}|${log.scheduled_date}|${normaliseTime(log.scheduled_time)}`, log);
  }

  const cellsByDate = new Map<string, AdherenceCell>();
  const days = Math.max(0, diffDays(from, to));
  for (let i = 0; i <= days; i++) {
    const date = addDays(from, i);
    cellsByDate.set(date, { date, expected: 0, taken: 0, skipped: 0, unlogged: 0 });
  }

  for (const medicine of medicines) {
    const doses = expectedDoses({ medicine, from, to });
    for (const dose of doses) {
      const cell = cellsByDate.get(dose.date);
      if (!cell) continue;
      cell.expected += 1;
      const log = logsByKey.get(`${medicine.id}|${dose.date}|${dose.time}`);
      if (!log) {
        cell.unlogged += 1;
      } else if (log.status === "taken") {
        cell.taken += 1;
      } else {
        cell.skipped += 1;
      }
    }
  }

  return [...cellsByDate.values()];
}

/** Taken out of expected across a grid, without dividing by zero. */
export function adherenceRatio(grid: AdherenceCell[]): { taken: number; expected: number } {
  return grid.reduce(
    (totals, cell) => ({ taken: totals.taken + cell.taken, expected: totals.expected + cell.expected }),
    { taken: 0, expected: 0 },
  );
}
