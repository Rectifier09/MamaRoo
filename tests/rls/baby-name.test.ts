import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("baby-name-alice"));
  bob = await asUser(uniqueEmail("baby-name-bob"));
  const alicePregnancy = await alice.client.from("pregnancies").insert({
    user_id: alice.userId,
    edd: "2027-04-01",
    edd_source: "manual",
    pregnancy_flags: [],
  });
  if (alicePregnancy.error) throw alicePregnancy.error;
  const bobPregnancy = await bob.client.from("pregnancies").insert({
    user_id: bob.userId,
    edd: "2027-04-01",
    edd_source: "manual",
    pregnancy_flags: ["twins"],
  });
  if (bobPregnancy.error) throw bobPregnancy.error;
});

afterAll(resetUsers);

describe("RLS and constraints for baby names", () => {
  it("lets authenticated users read the active bilingual catalog", async () => {
    const { data, error } = await alice.client.from("baby_names").select("id,name,meaning_en,meaning_hi,is_active");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(6);
    expect(data?.every((row) => row.is_active && row.meaning_en.trim() && row.meaning_hi.trim())).toBe(true);
  });

  it("does not let an authenticated user write catalog content", async () => {
    const { error } = await alice.client.from("baby_names").insert({
      name: "Test name",
      meaning_en: "Test meaning",
      meaning_hi: "परीक्षण अर्थ",
    });
    expect(error).not.toBeNull();

    const first = await alice.client.from("baby_names").select("id").limit(1).single();
    const update = await alice.client.from("baby_names").update({ meaning_en: "Changed" }).eq("id", first.data!.id).select("id");
    const remove = await alice.client.from("baby_names").delete().eq("id", first.data!.id).select("id");
    expect(update.data).toEqual([]);
    expect(remove.data).toEqual([]);
  });

  it("scopes favorite CRUD to the owning user", async () => {
    const catalog = await alice.client.from("baby_names").select("id").order("sort_order").limit(2);
    const [first, second] = catalog.data!;
    const created = await alice.client.from("baby_name_favorites").insert({ user_id: alice.userId, baby_name_id: first!.id }).select("id").single();
    expect(created.error).toBeNull();
    expect((await bob.client.from("baby_name_favorites").select("*")).data).toEqual([]);

    const changed = await alice.client.from("baby_name_favorites").update({ baby_name_id: second!.id }).eq("id", created.data!.id).select("baby_name_id").single();
    expect(changed.data?.baby_name_id).toBe(second!.id);
    expect((await alice.client.from("baby_name_favorites").delete().eq("id", created.data!.id)).error).toBeNull();
  });

  it("refuses forged ownership and references to a missing catalog row", async () => {
    const name = await alice.client.from("baby_names").select("id").limit(1).single();
    expect((await bob.client.from("baby_name_favorites").insert({ user_id: alice.userId, baby_name_id: name.data!.id })).error).not.toBeNull();
    expect((await alice.client.from("baby_name_favorites").insert({ user_id: alice.userId, baby_name_id: "30000000-0000-4000-8000-000000000099" })).error).not.toBeNull();
  });

  it("stores an empty or one-item singleton array and rejects a second name", async () => {
    const one = await alice.client.from("pregnancies").update({ baby_name: ["Aditi"] }).eq("status", "active");
    expect(one.error).toBeNull();
    const two = await alice.client.from("pregnancies").update({ baby_name: ["Aditi", "Noor"] }).eq("status", "active");
    expect(two.error).not.toBeNull();
    const empty = await alice.client.from("pregnancies").update({ baby_name: [] }).eq("status", "active");
    expect(empty.error).toBeNull();
  });

  it("stores two twin names, rejects a third, and validates every element", async () => {
    expect((await bob.client.from("pregnancies").update({ baby_name: ["Aditi", "Noor"] }).eq("status", "active")).error).toBeNull();
    expect((await bob.client.from("pregnancies").update({ baby_name: ["Aditi", "Noor", "Tara"] }).eq("status", "active")).error).not.toBeNull();
    expect((await bob.client.from("pregnancies").update({ baby_name: ["Aditi", " "] }).eq("status", "active")).error).not.toBeNull();
    expect((await bob.client.from("pregnancies").update({ baby_name: ["Aditi", "x".repeat(61)] }).eq("status", "active")).error).not.toBeNull();
  });
});
