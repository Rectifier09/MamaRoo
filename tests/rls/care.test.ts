import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
  bob = await asUser(uniqueEmail("bob"));
});

afterAll(resetUsers);

describe("RLS on the care tables", () => {
  it("returns nothing when another user reads her medicines", async () => {
    const { data } = await bob.client.from("medicines").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a medicine insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("medicines").insert({
      user_id: alice.userId,
      name: "test",
      start_date: "2026-09-01",
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her medicine logs", async () => {
    const { data } = await bob.client.from("medicine_logs").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a medicine log insert carrying another user's user_id", async () => {
    const med = await alice.client
      .from("medicines")
      .insert({ user_id: alice.userId, name: "Iron", start_date: "2026-09-01", schedule_times: ["08:00"] })
      .select("id")
      .single();
    const { error } = await bob.client.from("medicine_logs").insert({
      user_id: alice.userId,
      medicine_id: med.data!.id,
      scheduled_date: "2026-09-11",
      scheduled_time: "08:00",
      status: "taken",
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her appointments", async () => {
    const { data } = await bob.client.from("appointments").select("*");
    expect(data).toEqual([]);
  });

  it("refuses an appointment insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("appointments").insert({
      user_id: alice.userId,
      title: "test",
      scheduled_at: "2026-09-20T10:00:00Z",
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her doctor advice", async () => {
    const { data } = await bob.client.from("doctor_advice").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a doctor advice insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("doctor_advice").insert({
      user_id: alice.userId,
      recorded_on: "2026-09-11",
      body: "test",
      input_method: "text",
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her vitals", async () => {
    const { data } = await bob.client.from("vitals").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a vitals insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("vitals").insert({
      user_id: alice.userId,
      measured_on: "2026-09-11",
      kind: "weight",
      value_1: 60,
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her reports", async () => {
    const { data } = await bob.client.from("reports").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a reports insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("reports").insert({
      user_id: alice.userId,
      title: "test",
      report_date: "2026-09-11",
      storage_path: `${alice.userId}/x/test.pdf`,
      mime_type: "application/pdf",
      size_bytes: 1000,
    });
    expect(error).not.toBeNull();
  });

  it("refuses to log a dose against another user's medicine", async () => {
    const aliceMedicine = await alice.client
      .from("medicines")
      .insert({ user_id: alice.userId, name: "Calcium", start_date: "2026-09-01", schedule_times: ["08:00"] })
      .select("id")
      .single();
    const { error } = await bob.client.from("medicine_logs").insert({
      user_id: bob.userId, // his own row, so RLS passes
      medicine_id: aliceMedicine.data!.id, // her medicine
      scheduled_date: "2026-09-11",
      scheduled_time: "08:00",
      status: "taken",
    });
    expect(error).not.toBeNull();
  });

  it("refuses to link advice to another user's appointment", async () => {
    const aliceAppointment = await alice.client
      .from("appointments")
      .insert({ user_id: alice.userId, title: "Scan", scheduled_at: "2026-09-20T10:00:00Z" })
      .select("id")
      .single();
    const { error } = await bob.client.from("doctor_advice").insert({
      user_id: bob.userId,
      appointment_id: aliceAppointment.data!.id,
      recorded_on: "2026-09-11",
      body: "test",
      input_method: "text",
    });
    expect(error).not.toBeNull();
  });

  it("refuses a duplicate log for the same medicine, date and time", async () => {
    const med = await alice.client
      .from("medicines")
      .insert({ user_id: alice.userId, name: "Folic acid", start_date: "2026-09-01", schedule_times: ["09:00"] })
      .select("id")
      .single();

    const row = {
      user_id: alice.userId,
      medicine_id: med.data!.id,
      scheduled_date: "2026-09-11",
      scheduled_time: "09:00",
      status: "taken" as const,
    };
    expect((await alice.client.from("medicine_logs").insert(row)).error).toBeNull();
    expect((await alice.client.from("medicine_logs").insert(row)).error?.code).toBe("23505");
  });

  it("allows logging a dose from a past date, so a late log is never blocked", async () => {
    const med = await alice.client
      .from("medicines")
      .insert({ user_id: alice.userId, name: "Iron", start_date: "2026-08-01", schedule_times: ["21:00"] })
      .select("id")
      .single();
    const { error } = await alice.client.from("medicine_logs").insert({
      user_id: alice.userId,
      medicine_id: med.data!.id,
      scheduled_date: "2026-08-05",
      scheduled_time: "21:00",
      status: "taken",
    });
    expect(error).toBeNull();
  });

  it("refuses a blood pressure reading with only one number", async () => {
    const { error } = await alice.client
      .from("vitals")
      .insert({ user_id: alice.userId, measured_on: "2026-09-11", kind: "bp", value_1: 120 });
    expect(error).not.toBeNull();
  });

  it("refuses a diastolic at or above the systolic, which is a data-entry error", async () => {
    const { error } = await alice.client
      .from("vitals")
      .insert({ user_id: alice.userId, measured_on: "2026-09-11", kind: "bp", value_1: 80, value_2: 120 });
    expect(error).not.toBeNull();
  });

  it("accepts a clinically notable but possible reading, because blocking it would be worse", async () => {
    const { error } = await alice.client
      .from("vitals")
      .insert({ user_id: alice.userId, measured_on: "2026-09-13", kind: "bp", value_1: 165, value_2: 105 });
    expect(error).toBeNull();
  });

  it("refuses an impossible weight but accepts a high-normal one", async () => {
    expect(
      (await alice.client.from("vitals").insert({ user_id: alice.userId, measured_on: "2026-09-11", kind: "weight", value_1: 900 }))
        .error,
    ).not.toBeNull();
    expect(
      (await alice.client.from("vitals").insert({ user_id: alice.userId, measured_on: "2026-09-12", kind: "weight", value_1: 96.5 }))
        .error,
    ).toBeNull();
  });

  it("refuses a report larger than the 20 MB ceiling", async () => {
    const { error } = await alice.client.from("reports").insert({
      user_id: alice.userId,
      title: "Scan",
      report_date: "2026-09-11",
      storage_path: `${alice.userId}/x/scan.pdf`,
      mime_type: "application/pdf",
      size_bytes: 30_000_000,
    });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her personal notes", async () => {
    const { data } = await bob.client.from("personal_notes").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a personal note insert carrying another user's user_id", async () => {
    const { error } = await bob.client.from("personal_notes").insert({
      user_id: alice.userId,
      body: "test",
    });
    expect(error).not.toBeNull();
  });

  it("refuses an empty personal note", async () => {
    const { error } = await alice.client.from("personal_notes").insert({
      user_id: alice.userId,
      body: "   ",
    });
    expect(error).not.toBeNull();
  });

  it("refuses another user's update or delete of a personal note", async () => {
    const note = await alice.client
      .from("personal_notes")
      .insert({ user_id: alice.userId, body: "Felt the first kick today" })
      .select("id")
      .single();

    const updated = await bob.client
      .from("personal_notes")
      .update({ body: "hijacked" })
      .eq("id", note.data!.id)
      .select("id")
      .maybeSingle();
    expect(updated.data).toBeNull();

    const deleted = await bob.client.from("personal_notes").delete().eq("id", note.data!.id).select("id").maybeSingle();
    expect(deleted.data).toBeNull();
  });
});
