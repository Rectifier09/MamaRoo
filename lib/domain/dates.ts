import { APP_TIMEZONE } from "@/lib/config";

const MS_PER_DAY = 86_400_000;
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The calendar day in the app's timezone. Every "today" decision in the product
 * goes through here, so a user in Delhi and a server in Virginia agree.
 */
export function todayInAppZone(now: Date = new Date()): string {
  return formatter.format(now); // en-CA formats as YYYY-MM-DD
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

function toUtcMillis(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUtcMillis(ms: number): string {
  const date = new Date(ms);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date-only arithmetic done at UTC midnight, so no timezone can shift the result. */
export function addDays(date: string, days: number): string {
  return fromUtcMillis(toUtcMillis(date) + days * MS_PER_DAY);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / MS_PER_DAY);
}
