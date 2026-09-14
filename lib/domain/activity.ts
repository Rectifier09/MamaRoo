import { diffDays } from "@/lib/domain/dates";

export type ActivityKind =
  | "moodGood"
  | "moodNew"
  | "moodWorried"
  | "medicineTaken"
  | "medicineSkipped"
  | "wellness"
  | "milestone"
  | "appointment";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  occurredAt: string;
  /** Interpolation params for the i18n key the UI picks by kind. Never display copy. */
  params: Record<string, string>;
}

export interface ActivityCheckin {
  id: string;
  feeling: "good" | "new" | "worried" | null;
  created_at: string;
  /** Session 33 follow-up: carried through to params.body for the feed's
   * detail view. The list row itself still shows only the fixed mood copy
   * (ActivityFeed.tsx) -- this exists so a tap can reveal what she actually
   * typed, not so the row can. */
  body: string | null;
}

export interface ActivityMedicineLog {
  id: string;
  medicine_name: string;
  status: "taken" | "skipped";
  logged_at: string;
}

export interface ActivityWellnessEvent {
  id: string;
  label: string;
  occurred_at: string;
}

export interface ActivityMilestone {
  id: string;
  titleKey: string;
  occurred_at: string;
}

export interface ActivityAppointment {
  id: string;
  title: string;
  occurred_at: string;
}

const MOOD_KIND: Record<"good" | "new" | "worried", ActivityKind> = {
  good: "moodGood",
  new: "moodNew",
  worried: "moodWorried",
};

/**
 * Merges every source of "what she did" into one reverse-chronological feed for
 * Recent Activity (Session 18.5). milestones, appointments and wellnessEvents
 * are accepted here even though their producers don't exist until Sessions
 * 20, 23 and (for wellness) never yet -- there is no wellness-logging feature
 * anywhere in this plan, so that array is always [] until one is built. Wiring
 * a new producer in later is a one-line addition to
 * lib/supabase/queries/activity.ts, not a change to this function.
 */
export function buildActivityFeed({
  checkins,
  medicineLogs,
  milestones,
  appointments,
  wellnessEvents,
}: {
  checkins: ActivityCheckin[];
  medicineLogs: ActivityMedicineLog[];
  milestones: ActivityMilestone[];
  appointments: ActivityAppointment[];
  wellnessEvents: ActivityWellnessEvent[];
  now: number;
}): ActivityEntry[] {
  const moodEntries: ActivityEntry[] = checkins.map((c) => ({
    id: c.id,
    kind: MOOD_KIND[c.feeling ?? "new"],
    occurredAt: c.created_at,
    params: { body: c.body ?? "" },
  }));

  const medicineEntries: ActivityEntry[] = medicineLogs.map((l) => ({
    id: l.id,
    kind: l.status === "taken" ? "medicineTaken" : "medicineSkipped",
    occurredAt: l.logged_at,
    params: { medicineName: l.medicine_name },
  }));

  const wellnessEntries: ActivityEntry[] = wellnessEvents.map((w) => ({
    id: w.id,
    kind: "wellness",
    occurredAt: w.occurred_at,
    params: { label: w.label },
  }));

  const milestoneEntries: ActivityEntry[] = milestones.map((m) => ({
    id: m.id,
    kind: "milestone",
    occurredAt: m.occurred_at,
    params: { titleKey: m.titleKey },
  }));

  const appointmentEntries: ActivityEntry[] = appointments.map((a) => ({
    id: a.id,
    kind: "appointment",
    occurredAt: a.occurred_at,
    params: { title: a.title },
  }));

  return [...moodEntries, ...medicineEntries, ...wellnessEntries, ...milestoneEntries, ...appointmentEntries].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

export interface ActivityGroup {
  labelKey: "activity.today" | "activity.yesterday" | "activity.thisWeek" | "activity.earlier";
  entries: ActivityEntry[];
}

const GROUP_ORDER: ActivityGroup["labelKey"][] = ["activity.today", "activity.yesterday", "activity.thisWeek", "activity.earlier"];

export function groupActivityByDay({ entries, today }: { entries: ActivityEntry[]; today: string }): ActivityGroup[] {
  const buckets: Record<ActivityGroup["labelKey"], ActivityEntry[]> = {
    "activity.today": [],
    "activity.yesterday": [],
    "activity.thisWeek": [],
    "activity.earlier": [],
  };
  for (const e of entries) {
    const day = e.occurredAt.slice(0, 10);
    const age = diffDays(day, today);
    const key: ActivityGroup["labelKey"] =
      age === 0 ? "activity.today" : age === 1 ? "activity.yesterday" : age <= 7 ? "activity.thisWeek" : "activity.earlier";
    buckets[key]!.push(e);
  }
  return GROUP_ORDER.filter((k) => buckets[k]!.length > 0).map((k) => ({ labelKey: k, entries: buckets[k]! }));
}
