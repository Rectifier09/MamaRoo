export const ADVICE_BODY_MAX_LENGTH = 4000;

export const ADVICE_TYPES = [
  "medicine",
  "test",
  "scan",
  "appointment",
  "diet",
  "exercise",
  "question",
  "other",
] as const;

export type AdviceType = (typeof ADVICE_TYPES)[number];

export function isAdviceType(value: unknown): value is AdviceType {
  return typeof value === "string" && (ADVICE_TYPES as readonly string[]).includes(value);
}

export interface AdviceUpdateRecord {
  id: string;
  body: string;
  doctorName: string | null;
  createdAt: string;
}

export interface AdviceRecord {
  id: string;
  type: AdviceType;
  isReminder: boolean;
  /** Oldest first, so the original entry always leads the history. */
  updates: AdviceUpdateRecord[];
}

export type AdviceBodyValidationError = "invalid" | "empty" | "too_long";

export type AdviceBodyValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: AdviceBodyValidationError };

export function validateAdviceBody(body: unknown): AdviceBodyValidationResult {
  if (typeof body !== "string") return { ok: false, error: "invalid" };
  const value = body.trim();
  if (!value) return { ok: false, error: "empty" };
  if (value.length > ADVICE_BODY_MAX_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, value };
}

/** The doctor's name is optional free text -- trims to null rather than an empty string. */
export function normalizeDoctorName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function latestUpdate(advice: AdviceRecord): AdviceUpdateRecord | null {
  return advice.updates.at(-1) ?? null;
}

/** Threads with more recent activity (their own creation or a later appended
 * update) sort first, without mutating the input array. */
export function sortAdviceByRecency(advice: AdviceRecord[]): AdviceRecord[] {
  return [...advice].sort((a, b) => {
    const aTime = new Date(latestUpdate(a)?.createdAt ?? 0).getTime();
    const bTime = new Date(latestUpdate(b)?.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}

export interface AdviceRow {
  id: string;
  type: string;
  is_reminder: boolean;
}

export interface AdviceUpdateRow {
  id: string;
  advice_id: string;
  body: string;
  doctor_name: string | null;
  created_at: string;
}

/**
 * Joins the two flat tables the query layer fetches into one record per
 * thread, the same fetch-flat-then-join-in-the-domain-layer shape as
 * medicines/medicine_logs and adherenceGrid. A thread with no updates yet
 * (shouldn't happen -- creation always writes one -- but a partial failure
 * could leave one) is dropped rather than shown as a blank card.
 */
export function assembleAdvice({
  adviceRows,
  updateRows,
}: {
  adviceRows: AdviceRow[];
  updateRows: AdviceUpdateRow[];
}): AdviceRecord[] {
  const updatesByAdvice = new Map<string, AdviceUpdateRecord[]>();
  for (const row of updateRows) {
    const list = updatesByAdvice.get(row.advice_id) ?? [];
    list.push({ id: row.id, body: row.body, doctorName: row.doctor_name, createdAt: row.created_at });
    updatesByAdvice.set(row.advice_id, list);
  }
  for (const list of updatesByAdvice.values()) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const assembled = adviceRows
    .filter((row) => isAdviceType(row.type))
    .map((row): AdviceRecord => ({
      id: row.id,
      type: row.type as AdviceType,
      isReminder: row.is_reminder,
      updates: updatesByAdvice.get(row.id) ?? [],
    }))
    .filter((advice) => advice.updates.length > 0);

  return sortAdviceByRecency(assembled);
}
