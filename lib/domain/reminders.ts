import { diffDays, todayInAppZone } from "@/lib/domain/dates";
import { APP_TIMEZONE } from "@/lib/config";

export interface ReminderMedicine {
  id: string;
  name: string;
  schedule_times: string[];
  days_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface ReminderAppointment {
  id: string;
  title: string;
  scheduled_at: string;
  status: "upcoming" | "completed" | "cancelled";
}

export interface ReminderLog {
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "taken" | "skipped";
}

export type Reminder =
  | { kind: "dose"; refId: string; medicineName: string; scheduledTime: string; isOverdue: true }
  | { kind: "appointment"; refId: string; title: string; daysAhead: number; scheduledAt: string };

/** 1 = Monday through 7 = Sunday, matching the medicines.days_of_week convention. */
function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

function minutesNowInAppZone(now: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(now));
  const [h, m] = parts.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/**
 * Today's outstanding items only. A dose is outstanding when its time has passed
 * and no log row exists for it. "Missed" is never stored, so a late log always works.
 *
 * The result is shown on Today as a single "Next: {reminders[0]}" line (see
 * Session 18.8) -- the array itself may hold more than one item, sorted overdue
 * doses first, but the screen deliberately surfaces only the most pressing one.
 */
export function buildReminders({
  today,
  now,
  appointments,
  medicines,
  logs,
}: {
  today: string;
  now: number;
  appointments: ReminderAppointment[];
  medicines: ReminderMedicine[];
  logs: ReminderLog[];
}): Reminder[] {
  const nowMinutes = minutesNowInAppZone(now);
  const weekday = isoWeekday(today);

  const logged = new Set(
    logs
      .filter((l) => l.scheduled_date === today)
      .map((l) => `${l.medicine_id}@${l.scheduled_time.slice(0, 5)}`),
  );

  const doses: Reminder[] = [];
  for (const medicine of medicines) {
    if (!medicine.is_active) continue;
    if (diffDays(medicine.start_date, today) < 0) continue;
    if (medicine.end_date && diffDays(medicine.end_date, today) > 0) continue;
    if (medicine.days_of_week && !medicine.days_of_week.includes(weekday)) continue;

    for (const raw of medicine.schedule_times) {
      const time = raw.slice(0, 5);
      if (minutesOf(time) > nowMinutes) continue;
      if (logged.has(`${medicine.id}@${time}`)) continue;
      doses.push({
        kind: "dose",
        refId: medicine.id,
        medicineName: medicine.name,
        scheduledTime: time,
        isOverdue: true,
      });
    }
  }
  doses.sort((a, b) =>
    a.kind === "dose" && b.kind === "dose" ? a.scheduledTime.localeCompare(b.scheduledTime) : 0,
  );

  const next = appointments
    .filter((a) => a.status === "upcoming" && new Date(a.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  const appointmentReminders: Reminder[] = next
    ? [
        {
          kind: "appointment",
          refId: next.id,
          title: next.title,
          scheduledAt: next.scheduled_at,
          daysAhead: diffDays(today, new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date(next.scheduled_at))),
        },
      ]
    : [];

  return [...doses, ...appointmentReminders];
}

export { todayInAppZone };
