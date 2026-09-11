import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
  bob = await asUser(uniqueEmail("bob"));

  await alice.client.from("pregnancies").insert({
    user_id: alice.userId,
    lmp_date: "2026-03-01",
    edd: "2026-12-06",
    edd_source: "lmp",
  });
});

afterAll(resetUsers);

// kick_sessions and contraction_sessions each allow only one OPEN row per user.
// Several tests below only need a session to exist as a parent for a child row
// (a tap, a contraction) and don't care whether it stays open — but if left open,
// it collides with the "one open per user" index the next time such a test runs.
// Closing every open session after each test keeps that constraint from leaking
// state between tests that are otherwise independent.
afterEach(async () => {
  const now = new Date().toISOString();
  await admin.from("kick_sessions").update({ ended_at: now }).is("ended_at", null);
  await admin.from("contraction_sessions").update({ ended_at: now }).is("ended_at", null);
});

describe("RLS on the daily-experience tables", () => {
  it("returns nothing when another user reads her check-ins", async () => {
    const { data } = await bob.client.from("checkins").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a check-in insert carrying another user's user_id", async () => {
    const { error } = await bob.client
      .from("checkins")
      .insert({ user_id: alice.userId, body: "test", input_method: "text" });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her timeline", async () => {
    const { data } = await bob.client.from("timeline_events").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a timeline event insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("timeline_events").insert({
      user_id: alice.userId,
      source: "user",
      event_type: "note",
      occurred_at: new Date().toISOString(),
      title: "test",
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her kick sessions", async () => {
    const { data } = await bob.client.from("kick_sessions").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a kick session insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("kick_sessions").insert({ user_id: alice.userId });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her kick events", async () => {
    const { data } = await bob.client.from("kick_events").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a kick event insert carrying another user's user_id", async () => {
    const session = await alice.client
      .from("kick_sessions")
      .insert({ user_id: alice.userId })
      .select("id")
      .single();
    const { error } = await bob.client.from("kick_events").insert({
      user_id: alice.userId,
      session_id: session.data!.id,
      tap_id: crypto.randomUUID(),
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her contraction sessions", async () => {
    const { data } = await bob.client.from("contraction_sessions").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a contraction session insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("contraction_sessions").insert({ user_id: alice.userId });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her contractions", async () => {
    const { data } = await bob.client.from("contractions").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a contraction insert carrying another user's user_id", async () => {
    const session = await alice.client
      .from("contraction_sessions")
      .insert({ user_id: alice.userId })
      .select("id")
      .single();
    const { error } = await bob.client.from("contractions").insert({
      user_id: alice.userId,
      session_id: session.data!.id,
      started_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("refuses to attach a check-in to another user's pregnancy", async () => {
    const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
    const { error } = await bob.client.from("checkins").insert({
      user_id: bob.userId, // his own row, so RLS is satisfied
      pregnancy_id: alicePregnancy.data!.id, // but her pregnancy
      body: "test",
      input_method: "text",
    });
    expect(error).not.toBeNull(); // composite FK rejects it
  });

  it("refuses to attach a timeline event to another user's pregnancy", async () => {
    const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
    const { error } = await bob.client.from("timeline_events").insert({
      user_id: bob.userId,
      pregnancy_id: alicePregnancy.data!.id,
      source: "user",
      event_type: "note",
      occurred_at: new Date().toISOString(),
      title: "test",
    });
    expect(error).not.toBeNull();
  });

  it("refuses to attach a kick session to another user's pregnancy", async () => {
    const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
    const { error } = await bob.client.from("kick_sessions").insert({
      user_id: bob.userId,
      pregnancy_id: alicePregnancy.data!.id,
    });
    expect(error).not.toBeNull();
  });

  it("refuses to attach a contraction to another user's session", async () => {
    const aliceSession = await alice.client
      .from("contraction_sessions")
      .insert({ user_id: alice.userId })
      .select("id")
      .single();
    const { error } = await bob.client.from("contractions").insert({
      user_id: bob.userId,
      session_id: aliceSession.data!.id,
      started_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("still allows attaching to her own parent rows", async () => {
    const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
    const { error } = await alice.client.from("checkins").insert({
      user_id: alice.userId,
      pregnancy_id: alicePregnancy.data!.id,
      body: "feeling alright",
      input_method: "text",
    });
    expect(error).toBeNull();
  });

  it("refuses a second open kick session for the same user", async () => {
    await alice.client.from("kick_sessions").insert({ user_id: alice.userId });
    const { error } = await alice.client.from("kick_sessions").insert({ user_id: alice.userId });
    expect(error?.code).toBe("23505");
  });

  it("refuses a kick session that ends before it starts", async () => {
    const { error } = await alice.client.from("kick_sessions").insert({
      user_id: alice.userId,
      started_at: "2026-09-11T10:00:00Z",
      ended_at: "2026-09-11T09:00:00Z",
    });
    expect(error).not.toBeNull();
  });

  it("still allows deleting a pregnancy that has check-ins attached", async () => {
    // Regression: a composite ON DELETE SET NULL without a column list would try to
    // null user_id too, which is NOT NULL, making this delete impossible.
    const pregnancy = await alice.client
      .from("pregnancies")
      .insert({
        user_id: alice.userId,
        edd: "2027-06-01",
        edd_source: "manual",
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    await alice.client.from("checkins").insert({
      user_id: alice.userId,
      pregnancy_id: pregnancy.data!.id,
      body: "note",
      input_method: "text",
    });

    const { error } = await alice.client.from("pregnancies").delete().eq("id", pregnancy.data!.id);
    expect(error).toBeNull();

    const { data } = await alice.client.from("checkins").select("pregnancy_id, user_id").is("pregnancy_id", null);
    const orphaned = data!.find((row) => row.user_id === alice.userId);
    expect(orphaned).toBeDefined();
    expect(orphaned!.user_id).toBe(alice.userId); // survived, because only one column was nulled
  });

  it("records every distinct tap", async () => {
    const session = await alice.client
      .from("kick_sessions")
      .insert({ user_id: alice.userId })
      .select("id")
      .single();

    const taps = Array.from({ length: 10 }, () => crypto.randomUUID());
    await Promise.all(
      taps.map((tap_id) =>
        alice.client.from("kick_events").insert({ user_id: alice.userId, session_id: session.data!.id, tap_id }),
      ),
    );

    const { count } = await alice.client
      .from("kick_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.data!.id);
    expect(count).toBe(10);
  });

  it("treats a retried tap as the same tap, not a second one", async () => {
    const session = await alice.client
      .from("kick_sessions")
      .insert({ user_id: alice.userId })
      .select("id")
      .single();
    const tap_id = crypto.randomUUID();
    const row = { user_id: alice.userId, session_id: session.data!.id, tap_id };

    expect((await alice.client.from("kick_events").insert(row)).error).toBeNull();
    // The retry a client makes when a response is lost but the write committed.
    expect((await alice.client.from("kick_events").insert(row)).error?.code).toBe("23505");

    const { count } = await alice.client
      .from("kick_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.data!.id);
    expect(count).toBe(1);
  });

  it("refuses to record a tap against another user's session", async () => {
    const aliceSession = await alice.client
      .from("kick_sessions")
      .insert({ user_id: alice.userId })
      .select("id")
      .single();
    const { error } = await bob.client.from("kick_events").insert({
      user_id: bob.userId,
      session_id: aliceSession.data!.id,
      tap_id: crypto.randomUUID(),
    });
    expect(error).not.toBeNull();
  });

  it("accepts a contraction with no duration, because one may still be running", async () => {
    const session = await alice.client
      .from("contraction_sessions")
      .insert({ user_id: alice.userId })
      .select("id")
      .single();
    const { error } = await alice.client.from("contractions").insert({
      user_id: alice.userId,
      session_id: session.data!.id,
      started_at: new Date().toISOString(),
    });
    expect(error).toBeNull();
  });
});
