// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { admin, uniqueEmail } from "./helpers";

const email = uniqueEmail("waitlist");
let insertedId: string | undefined;
const anon = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

beforeAll(async () => {
  const { error } = await anon.rpc("join_waitlist", {
    p_name: "  आशा   शर्मा  ",
    p_email: email.toUpperCase(),
    p_locale: "hi",
  });
  if (error) throw error;
  const saved = await admin.from("waitlist").select("id").eq("email", email).single();
  if (saved.error) throw saved.error;
  insertedId = saved.data.id;
});

afterAll(async () => {
  // Delete only this test's exact row, never another session's records.
  if (insertedId) {
    const { error } = await admin.from("waitlist").delete().eq("id", insertedId);
    if (error) throw error;
  }
});

describe("private waitlist", () => {
  it("persists name, normalized email, locale, consent and database timestamp", async () => {
    const { data, error } = await admin.from("waitlist").select("*").eq("id", insertedId!).single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      name: "आशा शर्मा",
      email,
      locale: "hi",
      consent: "launch-email",
      consent_version: 1,
    });
    expect(Number.isNaN(Date.parse(data!.created_at))).toBe(false);
  });

  it("deduplicates without revealing or overwriting the first signup", async () => {
    const { error } = await anon.rpc("join_waitlist", {
      p_name: "Different name",
      p_email: email,
      p_locale: "en",
    });
    expect(error).toBeNull();
    const { data } = await admin.from("waitlist").select("name,locale").eq("email", email);
    expect(data).toEqual([{ name: "आशा शर्मा", locale: "hi" }]);
  });

  it("does not let anonymous visitors read, edit or delete signups", async () => {
    const results = await Promise.all([
      anon.from("waitlist").select("*").eq("email", email),
      anon.from("waitlist").update({ name: "Changed" }).eq("email", email),
      anon.from("waitlist").delete().eq("email", email),
      anon.from("waitlist").insert({ name: "Direct insert", email, locale: "en" }),
    ]);
    for (const result of results) expect(result.error?.code).toBe("42501");
  });

  it("enforces validation even when callers bypass the app", async () => {
    for (const args of [
      { p_name: "  ", p_email: email, p_locale: "en" },
      { p_name: "Asha", p_email: "invalid", p_locale: "en" },
      { p_name: "Asha", p_email: email, p_locale: "unsupported" },
    ]) {
      const { error } = await anon.rpc("join_waitlist", args);
      expect(error?.code).toBe("23514");
    }
  });
});
