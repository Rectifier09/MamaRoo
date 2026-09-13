// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerSupabase, from, getUser, revalidatePath, upsert, insert, update, eq, select, single } =
  vi.hoisted(() => ({
    createServerSupabase: vi.fn(),
    from: vi.fn(),
    getUser: vi.fn(),
    revalidatePath: vi.fn(),
    upsert: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { createMedicine, deactivateMedicine, logDose, updateMedicine } from "@/app/actions/medicines";

const input = {
  medicineId: "medicine-1",
  scheduledDate: "2026-09-12",
  scheduledTime: "09:00",
  status: "taken" as const,
};

beforeEach(() => {
  getUser.mockReset();
  from.mockReset();
  upsert.mockReset();
  insert.mockReset();
  update.mockReset();
  eq.mockReset();
  select.mockReset();
  single.mockReset();
  revalidatePath.mockReset();
  createServerSupabase.mockReset();
  from.mockReturnValue({ upsert, insert, update });
  insert.mockReturnValue({ select });
  select.mockReturnValue({ single });
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("logDose", () => {
  it("upserts the authenticated user's dose on the retry-safe unique constraint", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    upsert.mockResolvedValue({ error: null });

    await expect(logDose(input)).resolves.toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("medicine_logs");
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "auth-user",
        medicine_id: "medicine-1",
        scheduled_date: "2026-09-12",
        scheduled_time: "09:00",
        status: "taken",
      },
      { onConflict: "medicine_id,scheduled_date,scheduled_time" },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/today");
  });

  it("never trusts a client-supplied user_id", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    upsert.mockResolvedValue({ error: null });

    await logDose({ ...input, user_id: "attacker" } as typeof input & { user_id: string });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "auth-user" }),
      expect.anything(),
    );
    expect(upsert.mock.calls[0]![0]).not.toHaveProperty("user_id", "attacker");
  });

  it("rejects a status outside taken and skipped before touching Supabase", async () => {
    const result = await logDose({ ...input, status: "later" } as unknown as typeof input);
    expect(result).toEqual({ ok: false, error: "invalid_status" });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(logDose(input)).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns the database error and does not revalidate", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    upsert.mockResolvedValue({ error: { message: "write failed" } });
    await expect(logDose(input)).resolves.toEqual({ ok: false, error: "write failed" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

const medicineValue = {
  name: "Vitamin D3",
  dosage: null,
  form: null,
  scheduleTimes: ["09:00"],
  daysOfWeek: null,
  startDate: "2026-09-08",
  endDate: null,
  notes: null,
};

describe("createMedicine", () => {
  it("inserts the authenticated user's medicine and returns the created row", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    const row = { id: "m1", user_id: "auth-user", ...medicineValue };
    single.mockResolvedValue({ data: row, error: null });

    await expect(createMedicine(medicineValue)).resolves.toEqual({ ok: true, medicine: row });
    expect(from).toHaveBeenCalledWith("medicines");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "auth-user",
        name: "Vitamin D3",
        schedule_times: ["09:00"],
        start_date: "2026-09-08",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/care/medicines");
  });

  it("never trusts a client-supplied user_id", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    single.mockResolvedValue({ data: { id: "m1" }, error: null });

    await createMedicine({ ...medicineValue, user_id: "attacker" } as typeof medicineValue & { user_id: string });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "auth-user" }));
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(createMedicine(medicineValue)).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns the database error and does not revalidate", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    single.mockResolvedValue({ data: null, error: { message: "write failed" } });
    await expect(createMedicine(medicineValue)).resolves.toEqual({ ok: false, error: "write failed" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateMedicine", () => {
  it("updates only the authenticated user's own medicine", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    await expect(updateMedicine("m1", { scheduleTimes: ["10:00"] })).resolves.toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("medicines");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ schedule_times: ["10:00"] }));
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(updateMedicine("m1", { scheduleTimes: ["10:00"] })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("deactivateMedicine", () => {
  it("sets is_active false on only the authenticated user's own medicine", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    await expect(deactivateMedicine("m1")).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(deactivateMedicine("m1")).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });
});
