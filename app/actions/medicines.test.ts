// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerSupabase, from, getUser, revalidatePath, upsert } = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  revalidatePath: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { logDose } from "@/app/actions/medicines";

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
  revalidatePath.mockReset();
  createServerSupabase.mockReset();
  from.mockReturnValue({ upsert });
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
