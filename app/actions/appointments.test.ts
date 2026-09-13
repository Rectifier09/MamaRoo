// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerSupabase, from, getUser, revalidatePath, insert, update, eq, select, single } = vi.hoisted(
  () => ({
    createServerSupabase: vi.fn(),
    from: vi.fn(),
    getUser: vi.fn(),
    revalidatePath: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { addAppointment, cancelAppointment, completeAppointment, updateAppointment } from "@/app/actions/appointments";

const value = {
  title: "Dr. Priya Sharma",
  doctorName: "Dr. Priya Sharma",
  clinicName: "Sunrise Clinic",
  scheduledAt: "2026-09-20T05:30:00.000Z",
  location: null,
  notes: null,
};

beforeEach(() => {
  getUser.mockReset();
  from.mockReset();
  insert.mockReset();
  update.mockReset();
  eq.mockReset();
  select.mockReset();
  single.mockReset();
  revalidatePath.mockReset();
  createServerSupabase.mockReset();
  from.mockReturnValue({ insert, update });
  insert.mockReturnValue({ select });
  select.mockReturnValue({ single });
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("addAppointment", () => {
  it("inserts the authenticated user's appointment as upcoming and returns the created row", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    const row = { id: "appt-1", user_id: "auth-user", status: "upcoming", ...value };
    single.mockResolvedValue({ data: row, error: null });

    await expect(addAppointment(value)).resolves.toEqual({ ok: true, appointment: row });
    expect(from).toHaveBeenCalledWith("appointments");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "auth-user",
        title: "Dr. Priya Sharma",
        doctor_name: "Dr. Priya Sharma",
        clinic_name: "Sunrise Clinic",
        scheduled_at: "2026-09-20T05:30:00.000Z",
        status: "upcoming",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/care/appointments");
  });

  it("never trusts a client-supplied user_id", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    single.mockResolvedValue({ data: { id: "appt-1" }, error: null });
    await addAppointment({ ...value, user_id: "attacker" } as typeof value & { user_id: string });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "auth-user" }));
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(addAppointment(value)).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns the database error and does not revalidate", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    single.mockResolvedValue({ data: null, error: { message: "write failed" } });
    await expect(addAppointment(value)).resolves.toEqual({ ok: false, error: "write failed" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateAppointment", () => {
  it("updates only the authenticated user's own appointment", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    await expect(updateAppointment("appt-1", { scheduledAt: "2026-10-01T05:30:00.000Z" })).resolves.toEqual({
      ok: true,
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ scheduled_at: "2026-10-01T05:30:00.000Z" }));
    expect(eq).toHaveBeenCalledWith("id", "appt-1");
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(updateAppointment("appt-1", { scheduledAt: "2026-10-01T05:30:00.000Z" })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("completeAppointment", () => {
  it("sets status to completed", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    await expect(completeAppointment("appt-1")).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ status: "completed" });
    expect(eq).toHaveBeenCalledWith("id", "appt-1");
  });
});

describe("cancelAppointment", () => {
  it("sets status to cancelled", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    await expect(cancelAppointment("appt-1")).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ status: "cancelled" });
    expect(eq).toHaveBeenCalledWith("id", "appt-1");
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(cancelAppointment("appt-1")).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });
});
