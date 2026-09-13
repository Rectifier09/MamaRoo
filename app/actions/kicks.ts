"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { shouldAutoClose } from "@/lib/domain/kicks";

const DEFAULT_TARGET_COUNT = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface KickSessionTap {
  tapId: string;
  occurredAt: string;
}

export interface KickSessionState {
  id: string;
  startedAt: string;
  targetCount: number;
  taps: KickSessionTap[];
  /** False when an existing, still-resumable session was returned instead --
   * lets the client fire kick_session_started only once per real session,
   * not on every page load that happens to resume one. */
  isNew: boolean;
}

export type StartKickSessionResult = { ok: true; session: KickSessionState } | { ok: false; error: string };
export type RecordKickResult = { ok: true } | { ok: false; error: string };
export type FinishKickSessionResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * Get-or-create: resumes her currently open session if one exists and isn't
 * stale, silently closes it (no timeline entry -- it was never finished) and
 * starts a fresh one if it's older than shouldAutoClose's twelve-hour
 * boundary, or creates the first one if none exists. Called directly from
 * app/(app)/baby/kicks/page.tsx (a Server Component calling a "use server"
 * function as a plain async call, same as any other server-side read) so the
 * screen always renders with a real, current session already in hand.
 */
export async function startKickSession(): Promise<StartKickSessionResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const now = Date.now();

  const { data: open, error: openError } = await supabase
    .from("kick_sessions")
    .select("*")
    .is("ended_at", null)
    .maybeSingle();
  if (openError) return { ok: false, error: openError.message };

  if (open && !shouldAutoClose({ startedAt: open.started_at, now })) {
    const { data: taps, error: tapsError } = await supabase
      .from("kick_events")
      .select("tap_id, occurred_at")
      .eq("session_id", open.id)
      .order("occurred_at", { ascending: true });
    if (tapsError) return { ok: false, error: tapsError.message };

    return {
      ok: true,
      session: {
        id: open.id,
        startedAt: open.started_at,
        targetCount: open.target_count,
        taps: (taps ?? []).map((t) => ({ tapId: t.tap_id, occurredAt: t.occurred_at })),
        isNew: false,
      },
    };
  }

  if (open) {
    // Abandoned overnight -- close it quietly. This is housekeeping, not a
    // finished count, so no timeline_events row is written for it.
    const { error: closeError } = await supabase
      .from("kick_sessions")
      .update({ ended_at: new Date(now).toISOString() })
      .eq("id", open.id);
    if (closeError) return { ok: false, error: closeError.message };
  }

  const { data: pregnancy } = await supabase
    .from("pregnancies")
    .select("id")
    .eq("status", "active")
    .maybeSingle();

  const { data: created, error: insertError } = await supabase
    .from("kick_sessions")
    .insert({
      user_id: user.id,
      pregnancy_id: pregnancy?.id ?? null,
      target_count: DEFAULT_TARGET_COUNT,
    })
    .select("*")
    .single();
  if (insertError || !created) return { ok: false, error: insertError?.message ?? "insert_failed" };

  return {
    ok: true,
    session: {
      id: created.id,
      startedAt: created.started_at,
      targetCount: created.target_count,
      taps: [],
      isNew: true,
    },
  };
}

/**
 * One tap, one insert -- no debounce, no local array on either side of this
 * call. tapId is client-generated (crypto.randomUUID()) and reused verbatim
 * across a retry: the unique (session_id, tap_id) constraint on kick_events
 * makes a retried insert a no-op rather than a second kick, which is the
 * entire point of the column (see supabase/migrations/0003_daily.sql). A
 * duplicate-key error is therefore success, not failure -- it means her tap
 * was already recorded by an earlier attempt whose response never arrived.
 */
export async function recordKick(sessionId: string, tapId: string): Promise<RecordKickResult> {
  if (!UUID_RE.test(tapId)) return { ok: false, error: "invalid_tap_id" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("kick_events")
    .insert({ user_id: user.id, session_id: sessionId, tap_id: tapId });

  // Postgres unique_violation. Anything else is a real failure and must not
  // be swallowed -- showing a count the database doesn't have would be worse
  // than showing her the failure (Session 21's own instruction).
  if (error && error.code !== "23505") return { ok: false, error: error.message };

  return { ok: true };
}

export async function finishKickSession(sessionId: string): Promise<FinishKickSessionResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: session, error: sessionError } = await supabase
    .from("kick_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) return { ok: false, error: sessionError?.message ?? "not_found" };

  const { count, error: countError } = await supabase
    .from("kick_events")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (countError) return { ok: false, error: countError.message };

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("kick_sessions")
    .update({ ended_at: now })
    .eq("id", sessionId);
  if (updateError) return { ok: false, error: updateError.message };

  const { error: timelineError } = await supabase.from("timeline_events").insert({
    user_id: user.id,
    pregnancy_id: session.pregnancy_id,
    source: "user",
    event_type: "kick_session",
    occurred_at: now,
    title: `${count ?? 0} kicks counted`,
    ref_table: "kick_sessions",
    ref_id: sessionId,
  });
  if (timelineError) return { ok: false, error: timelineError.message };

  return { ok: true, count: count ?? 0 };
}
