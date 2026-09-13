import { describe, expect, it } from "vitest";
import { kickState, shouldAutoClose } from "@/lib/domain/kicks";

const start = new Date("2026-09-11T10:00:00Z").getTime();
const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
/** One recorded tap. tapId is carried so the UI can reconcile a retry without double counting. */
const tap = (minutes: number) => ({ tapId: `tap-${minutes}`, occurredAt: at(minutes) });

describe("kickState", () => {
  it("reports an empty session", () => {
    expect(kickState({ events: [], startedAt: at(0), now: start, targetCount: 10 })).toEqual({
      count: 0,
      remaining: 10,
      elapsedMinutes: 0,
      isComplete: false,
      lastKickAt: null,
    });
  });

  it("counts kicks and the time remaining to the target", () => {
    const state = kickState({
      events: [tap(1), tap(2), tap(3)],
      startedAt: at(0),
      now: start + 5 * 60_000,
      targetCount: 10,
    });
    expect(state).toMatchObject({ count: 3, remaining: 7, elapsedMinutes: 5, isComplete: false });
    expect(state.lastKickAt).toBe(at(3));
  });

  it("reports completion at the target", () => {
    const kicks = Array.from({ length: 10 }, (_, i) => tap(i + 1));
    expect(kickState({ events: kicks, startedAt: at(0), now: start + 600_000, targetCount: 10 })).toMatchObject({
      count: 10,
      remaining: 0,
      isComplete: true,
    });
  });

  it("does not report negative remaining when she taps past the target", () => {
    const kicks = Array.from({ length: 14 }, (_, i) => tap(i + 1));
    expect(kickState({ events: kicks, startedAt: at(0), now: start + 900_000, targetCount: 10 }).remaining).toBe(0);
  });

  it("rounds elapsed minutes down, so it never overstates the time", () => {
    expect(kickState({ events: [], startedAt: at(0), now: start + 119_000, targetCount: 10 }).elapsedMinutes).toBe(1);
  });

  it("handles a clock that appears to move backwards", () => {
    expect(kickState({ events: [], startedAt: at(5), now: start, targetCount: 10 }).elapsedMinutes).toBe(0);
  });

  it("counts a repeated tapId once, so a retried tap cannot inflate the count", () => {
    const duplicated = [tap(1), tap(2), tap(2)];
    expect(kickState({ events: duplicated, startedAt: at(0), now: start + 180_000, targetCount: 10 }).count).toBe(2);
  });

  it("orders by occurrence, not by the order rows arrived", () => {
    const shuffled = [tap(3), tap(1), tap(2)];
    expect(kickState({ events: shuffled, startedAt: at(0), now: start + 240_000, targetCount: 10 }).lastKickAt).toBe(at(3));
  });
});

describe("shouldAutoClose", () => {
  it("leaves a session from an hour ago open, so she can resume it", () => {
    expect(shouldAutoClose({ startedAt: at(0), now: start + 60 * 60_000 })).toBe(false);
  });

  it("closes a session left open overnight", () => {
    expect(shouldAutoClose({ startedAt: at(0), now: start + 13 * 60 * 60_000 })).toBe(true);
  });

  it("uses twelve hours as the boundary", () => {
    expect(shouldAutoClose({ startedAt: at(0), now: start + 12 * 60 * 60_000 - 1000 })).toBe(false);
    expect(shouldAutoClose({ startedAt: at(0), now: start + 12 * 60 * 60_000 + 1000 })).toBe(true);
  });
});
