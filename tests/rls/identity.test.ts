import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
  bob = await asUser(uniqueEmail("bob"));

  await alice.client.from("profiles").insert({ id: alice.userId, display_name: "Alice" });
  await alice.client.from("pregnancies").insert({
    user_id: alice.userId,
    lmp_date: "2026-03-01",
    edd: "2026-12-06",
    edd_source: "lmp",
  });
});

afterAll(resetUsers);

describe("RLS on identity tables", () => {
  it("lets a user read her own profile", async () => {
    const { data } = await alice.client.from("profiles").select("display_name").single();
    expect(data?.display_name).toBe("Alice");
  });

  it("returns nothing when another user reads her profile", async () => {
    const { data } = await bob.client.from("profiles").select("*").eq("id", alice.userId);
    expect(data).toEqual([]);
  });

  it("refuses a write to another user's row", async () => {
    const { error } = await bob.client
      .from("profiles")
      .insert({ id: alice.userId, display_name: "Not Alice" });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her pregnancy", async () => {
    const { data } = await bob.client.from("pregnancies").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a second active pregnancy for the same user", async () => {
    const { error } = await alice.client.from("pregnancies").insert({
      user_id: alice.userId,
      edd: "2027-01-01",
      edd_source: "manual",
    });
    expect(error?.code).toBe("23505");
  });

  it("reports the newest consent per key, so a withdrawal takes effect", async () => {
    const base = { user_id: alice.userId, consent_key: "analytics" as const, version: "v1", locale: "en" as const };
    await alice.client.from("consents").insert({ ...base, granted: true });
    await alice.client.from("consents").insert({ ...base, granted: false });
    await alice.client.from("consents").insert({ ...base, granted: true });

    const { data } = await alice.client
      .from("current_consents")
      .select("granted")
      .eq("consent_key", "analytics")
      .single();
    expect(data?.granted).toBe(true);

    await alice.client.from("consents").insert({ ...base, granted: false });
    const after = await alice.client
      .from("current_consents")
      .select("granted")
      .eq("consent_key", "analytics")
      .single();
    expect(after.data?.granted).toBe(false);
  });

  it("resolves a tie on granted_at by insertion order, and picks the later row", async () => {
    const at = "2026-09-11T10:00:00Z";
    const base = { user_id: alice.userId, consent_key: "optional_data_sharing" as const, version: "v1", locale: "en" as const, granted_at: at };
    // Inserted in one statement, so both rows share granted_at exactly. The grant is
    // first and the withdrawal second, so the withdrawal must win.
    await alice.client.from("consents").insert([
      { ...base, granted: true },
      { ...base, granted: false },
    ]);
    const { data } = await alice.client
      .from("current_consents")
      .select("granted")
      .eq("consent_key", "optional_data_sharing")
      .single();
    expect(data?.granted).toBe(false);
  });

  it("shows one user nothing of another user's consents through the view", async () => {
    const { data } = await bob.client.from("current_consents").select("*");
    expect(data).toEqual([]);
  });

  it("refuses to update a consent row, because the trail is immutable", async () => {
    await alice.client.from("consents").insert({
      user_id: alice.userId,
      consent_key: "terms",
      version: "2026-09-01",
      granted: true,
      locale: "en",
    });
    const { error, data } = await alice.client
      .from("consents")
      .update({ granted: false })
      .eq("user_id", alice.userId)
      .select();
    // No update policy exists, so the row is invisible to the update and nothing changes.
    expect(data ?? []).toEqual([]);
    expect(error).toBeNull();
  });

  it("has row level security enabled on every table in public", async () => {
    const { data, error } = await admin.rpc("tables_without_rls");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("does not expose the diagnostic to ordinary users", async () => {
    const { error } = await alice.client.rpc("tables_without_rls");
    expect(error).not.toBeNull();
  });

  // The RLS-coverage assertions above depend on the diagnostic function added to
  // migration 1 alongside the tables it guards. Do not attempt this by querying
  // pg_catalog through PostgREST: that is not exposed, and a test that merely expects
  // an error from the attempt passes without proving anything about RLS coverage.
});
