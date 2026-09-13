import en from "@/i18n/en.json";
import { expectedDoses, type AdherenceMedicine, type AdherenceLog } from "@/lib/domain/adherence";

const t = (key: keyof typeof en.care.medicines.errors) => en.care.medicines.errors[key];
const w = (key: keyof typeof en.care.medicines.warnings) => en.care.medicines.warnings[key];

const MAX_SCHEDULE_TIMES = 6;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRIORITY_KEYWORDS = ["iron", "folic", "calcium"];

/**
 * Iron/folic acid and calcium get the always-visible tracker card (Medicines.dc.html)
 * because they're the most-tracked antenatal items -- matched by name, not a schema
 * column, so the pin applies the moment she adds one and needs no migration.
 */
export function isPriorityMedicine(name: string): boolean {
  const lower = name.toLowerCase();
  return PRIORITY_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export interface MedicineInput {
  name: string;
  dosage?: string;
  form?: string;
  scheduleTimes: string[];
  daysOfWeek?: number[] | null;
  startDate: string;
  endDate?: string | null;
  notes?: string;
  /** Names of her other currently-active medicines, for the duplicate-name warning. */
  existingActiveNames?: string[];
}

export interface MedicineValue {
  name: string;
  dosage: string | null;
  form: string | null;
  scheduleTimes: string[];
  daysOfWeek: number[] | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

export type MedicineResult =
  | { ok: true; value: MedicineValue; warnings: Record<string, string> }
  | { ok: false; errors: Record<string, string> };

/**
 * Errors are collected across every field before returning, never
 * short-circuited on the first failure -- same convention as validateOnboarding.
 * A duplicate name against her own other active medicines is a warning, not an
 * error: two doses of the same drug (morning and evening iron, say) is legitimate.
 */
export function validateMedicine(input: MedicineInput): MedicineResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const name = (input.name ?? "").trim();
  if (name.length < 1) errors.name = t("nameRequired");

  const uniqueTimes = [...new Set(input.scheduleTimes ?? [])];
  if (uniqueTimes.length < 1) {
    errors.scheduleTimes = t("timeRequired");
  } else if (uniqueTimes.length > MAX_SCHEDULE_TIMES) {
    errors.scheduleTimes = t("tooManyTimes");
  } else if (uniqueTimes.some((time) => !TIME_PATTERN.test(time))) {
    errors.scheduleTimes = t("timeInvalid");
  }

  const endDate = input.endDate ?? null;
  if (endDate && endDate < input.startDate) {
    errors.endDate = t("endBeforeStart");
  }

  const daysOfWeek = input.daysOfWeek ?? null;
  if (daysOfWeek && (daysOfWeek.length < 1 || daysOfWeek.some((d) => d < 1 || d > 7))) {
    errors.daysOfWeek = t("daysOfWeekInvalid");
  }

  if (name && input.existingActiveNames?.some((existing) => existing.trim().toLowerCase() === name.toLowerCase())) {
    warnings.name = w("duplicateName");
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      dosage: input.dosage?.trim() || null,
      form: input.form?.trim() || null,
      scheduleTimes: uniqueTimes,
      daysOfWeek,
      startDate: input.startDate,
      endDate,
      notes: input.notes?.trim() || null,
    },
    warnings,
  };
}

export interface MedicineForList extends AdherenceMedicine {
  name: string;
  dosage: string | null;
}

export interface MedicineListItem {
  id: string;
  name: string;
  dosage: string | null;
  isPriority: boolean;
  status: "pending" | "taken" | "skipped";
  /** The dose to act on -- the earliest of today's doses not yet logged. Null once
   * every dose today is resolved (all taken or skipped), or when the medicine has
   * no dose scheduled today at all (a day-of-week restriction not covering today). */
  nextPendingTime: string | null;
  todayTimes: string[];
}

/** Reduces each medicine to the single row MedicineList needs for "today": its
 * doses due today, their combined status, and which dose (if any) is still
 * actionable. A medicine with no dose today (day-of-week restricted) still
 * shows its full schedule as metadata, with no action available. */
export function buildMedicineListItems({
  medicines,
  logs,
  today,
}: {
  medicines: MedicineForList[];
  logs: AdherenceLog[];
  today: string;
}): MedicineListItem[] {
  return medicines.map((medicine) => {
    const doses = expectedDoses({ medicine, from: today, to: today });
    const logsByTime = new Map(
      logs
        .filter((log) => log.medicine_id === medicine.id && log.scheduled_date === today)
        .map((log) => [log.scheduled_time.slice(0, 5), log.status]),
    );

    const doseStatuses = doses.map((dose) => logsByTime.get(dose.time) ?? "pending");
    const nextPendingTime = doses.find((dose) => !logsByTime.has(dose.time))?.time ?? null;

    let status: "pending" | "taken" | "skipped" = "pending";
    if (doseStatuses.length > 0 && doseStatuses.every((s) => s !== "pending")) {
      status = doseStatuses.some((s) => s === "skipped") ? "skipped" : "taken";
    }

    return {
      id: medicine.id,
      name: medicine.name,
      dosage: medicine.dosage,
      isPriority: isPriorityMedicine(medicine.name),
      status,
      nextPendingTime,
      todayTimes: doses.length > 0 ? doses.map((d) => d.time) : medicine.schedule_times.map((t) => t.slice(0, 5)),
    };
  });
}
