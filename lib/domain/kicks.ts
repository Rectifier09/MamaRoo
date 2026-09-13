export interface KickTap {
  tapId: string;
  occurredAt: string;
}

export interface KickStateResult {
  count: number;
  remaining: number;
  elapsedMinutes: number;
  isComplete: boolean;
  lastKickAt: string | null;
}

/** A session left open this long is treated as abandoned rather than resumed
 * -- she was almost certainly not still counting overnight. */
const AUTO_CLOSE_HOURS = 12;

/**
 * Pure projection of the rows in kick_events into what the counter screen
 * shows. Never trusts a running total kept anywhere else -- the rendered
 * count always comes from the rows, per Session 21's own design ("There is
 * no debounce and no local array. One tap, one insert, and the rendered
 * count comes from the rows.").
 */
export function kickState({
  events,
  startedAt,
  now,
  targetCount,
}: {
  events: KickTap[];
  startedAt: string;
  now: number;
  targetCount: number;
}): KickStateResult {
  // A duplicate tapId is the same physical tap recorded twice (a retried
  // insert after a lost response) -- collapse before counting, not after,
  // so both the count and lastKickAt reflect distinct taps only.
  const distinct = new Map<string, string>();
  for (const e of events) {
    if (!distinct.has(e.tapId)) distinct.set(e.tapId, e.occurredAt);
  }
  const occurredTimes = [...distinct.values()].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const count = occurredTimes.length;
  const remaining = Math.max(0, targetCount - count);
  const isComplete = count >= targetCount;
  const lastKickAt = occurredTimes.length > 0 ? occurredTimes[occurredTimes.length - 1]! : null;

  const rawElapsedMs = now - new Date(startedAt).getTime();
  // A clock that appears to move backwards (now before startedAt) reports
  // zero rather than a negative elapsed time.
  const elapsedMinutes = Math.max(0, Math.floor(Math.max(0, rawElapsedMs) / 60_000));

  return { count, remaining, elapsedMinutes, isComplete, lastKickAt };
}

export function shouldAutoClose({ startedAt, now }: { startedAt: string; now: number }): boolean {
  const elapsedHours = (now - new Date(startedAt).getTime()) / (60 * 60 * 1000);
  return elapsedHours > AUTO_CLOSE_HOURS;
}
