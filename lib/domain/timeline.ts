import { addDays } from "@/lib/domain/dates";
import { lmpFromEdd } from "@/lib/domain/pregnancy";

export type TimelineEventInput = {
  id: string;
  event_type: "kick_session" | "appointment" | "report" | "checkin" | "stage_change" | "note" | "vital";
  occurred_at: string;
  title: string;
  body: string | null;
  source: "user" | "system";
};

export type TimelineMilestoneInput = {
  /** Which of the nine illustration stages this milestone belongs to. */
  stage: number;
  /** Gestational week it's reached at -- used to date it and to decide whether it's reached yet. */
  week: number;
  /** Translation key, never copy -- see lib/domain/stages.ts for why the app never hardcodes stage text. */
  titleKey: string;
};

export type TimelineEntry =
  | { kind: "event"; id: string; occurredAt: string; title: string; body: string | null; eventType: TimelineEventInput["event_type"] }
  | { kind: "milestone"; id: string; occurredAt: string; week: number; stage: number; titleKey: string };

/**
 * Merges her own logged events with the system milestones she has already
 * reached into one reverse-chronological record. A milestone is dated by
 * adding week * 7 days to the last menstrual period -- deriving the LMP from
 * the EDD when only that is stored, since the two are always 280 days apart
 * (see lib/domain/pregnancy.ts). This is a record of what has happened, not a
 * forecast, so a milestone in the future never appears no matter how far
 * `currentWeek` runs ahead of it.
 */
export function buildTimeline({
  events,
  milestones,
  currentWeek,
  lmp,
  edd,
}: {
  events: TimelineEventInput[];
  milestones: TimelineMilestoneInput[];
  currentWeek: number;
  lmp?: string;
  edd?: string;
}): TimelineEntry[] {
  const effectiveLmp = lmp ?? (edd ? lmpFromEdd(edd) : undefined);

  const eventEntries: TimelineEntry[] = events.map((e) => ({
    kind: "event",
    id: e.id,
    occurredAt: e.occurred_at,
    title: e.title,
    body: e.body,
    eventType: e.event_type,
  }));

  const milestoneEntries: TimelineEntry[] = milestones
    .filter((m) => m.week <= currentWeek)
    .map((m) => ({
      kind: "milestone",
      id: `milestone-${m.stage}`,
      // No LMP or EDD at all means every milestone is undated and therefore
      // unreachable-in-order -- fall back to "now" rather than throwing, so a
      // pregnancy record mid-onboarding doesn't crash the timeline.
      occurredAt: effectiveLmp ? addDays(effectiveLmp, m.week * 7) : new Date(0).toISOString(),
      week: m.week,
      stage: m.stage,
      titleKey: m.titleKey,
    }));

  const merged = [...eventEntries, ...milestoneEntries];

  // Stable sort descending by occurredAt: Array.prototype.sort is guaranteed
  // stable since ES2019, so entries with an identical timestamp keep their
  // original relative order (events before milestones, and within each,
  // input order) rather than depending on comparator tie-breaking.
  return merged.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
