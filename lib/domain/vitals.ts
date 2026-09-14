export type VitalKind = "weight" | "bp";

export interface VitalRow {
  measured_on: string;
  kind: VitalKind;
  value_1: number;
  value_2: number | null;
}

export interface VitalPoint {
  date: string;
  value: number;
  secondValue?: number;
}

export interface VitalSeriesResult {
  points: VitalPoint[];
  domain: { min: number; max: number };
}

// A flat or empty series still needs an axis that isn't a single line at zero
// height. 10% of the value range, floored, keeps a genuinely flat series
// (every reading identical) from drawing as a degenerate flat line.
const DOMAIN_PAD_RATIO = 0.1;
const DOMAIN_PAD_MIN = 1;

function paddedDomain(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * DOMAIN_PAD_RATIO, DOMAIN_PAD_MIN);
  return { min: min - pad, max: max + pad };
}

export function vitalSeries({
  vitals,
  kind,
  from,
  to,
}: {
  vitals: VitalRow[];
  kind: VitalKind;
  from?: string;
  to?: string;
}): VitalSeriesResult {
  const filtered = vitals.filter(
    (v) => v.kind === kind && (from === undefined || v.measured_on >= from) && (to === undefined || v.measured_on <= to),
  );
  const sorted = [...filtered].sort((a, b) => a.measured_on.localeCompare(b.measured_on));

  const points: VitalPoint[] = sorted.map((v) => ({
    date: v.measured_on,
    value: v.value_1,
    ...(v.value_2 != null ? { secondValue: v.value_2 } : {}),
  }));

  const allValues = points.flatMap((p) => (p.secondValue !== undefined ? [p.value, p.secondValue] : [p.value]));
  const domain = paddedDomain(allValues);

  return { points, domain };
}

export type PlausibilityResult =
  | { ok: true }
  | { ok: true; warnKey: string }
  | { ok: false; field: string; messageKey: string };

// PHYSICALLY IMPOSSIBLE bounds only, mirroring the database's own CHECK
// constraints (supabase/migrations/0004_care.sql) exactly, so a rejection here
// is never surprised by a rejection there.
const WEIGHT_MIN_KG = 25;
const WEIGHT_MAX_KG = 250;
const SYSTOLIC_MIN = 50;
const SYSTOLIC_MAX = 300;
const DIASTOLIC_MIN = 30;
const DIASTOLIC_MAX = 200;

// The standard, publicly-cited gestational-hypertension SCREENING threshold
// (>=140 systolic or >=90 diastolic) -- a heuristic for "worth a note", never
// a diagnosis. The reading is still saved either way; this only decides
// whether plausibility() attaches a non-clinical warnKey alongside `ok: true`.
const BP_NOTABLE_SYSTOLIC = 140;
const BP_NOTABLE_DIASTOLIC = 90;

export function plausibility({
  kind,
  value1,
  value2,
}: {
  kind: VitalKind;
  value1: number;
  value2?: number;
}): PlausibilityResult {
  if (kind === "weight") {
    if (value1 < WEIGHT_MIN_KG || value1 > WEIGHT_MAX_KG) {
      return { ok: false, field: "value1", messageKey: "vitals.errors.weightRange" };
    }
    return { ok: true };
  }

  // bp
  if (value2 == null) {
    return { ok: false, field: "value2", messageKey: "vitals.errors.bpBothRequired" };
  }
  if (value1 < SYSTOLIC_MIN || value1 > SYSTOLIC_MAX) {
    return { ok: false, field: "value1", messageKey: "vitals.errors.systolicRange" };
  }
  if (value2 < DIASTOLIC_MIN || value2 > DIASTOLIC_MAX) {
    return { ok: false, field: "value2", messageKey: "vitals.errors.diastolicRange" };
  }
  if (value2 >= value1) {
    return { ok: false, field: "value2", messageKey: "vitals.errors.diastolicBelowSystolic" };
  }
  if (value1 >= BP_NOTABLE_SYSTOLIC || value2 >= BP_NOTABLE_DIASTOLIC) {
    return { ok: true, warnKey: "vitals.notes.bpNotable" };
  }
  return { ok: true };
}
