// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerSupabase, from, getUser, revalidatePath, insert, eq, select, single } = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  revalidatePath: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { addVital } from "@/app/actions/vitals";

beforeEach(() => {
  getUser.mockReset();
  from.mockReset();
  insert.mockReset();
  eq.mockReset();
  select.mockReset();
  single.mockReset();
  revalidatePath.mockReset();
  createServerSupabase.mockReset();
  from.mockReturnValue({ insert });
  insert.mockReturnValue({ select });
  select.mockReturnValue({ single });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("addVital", () => {
  it("rejects when there is no authenticated user, without touching the database", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await addVital({ kind: "weight", measuredOn: "2026-09-14", value1: 62 });
    expect(result).toEqual({ ok: false, error: "not_authenticated" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a physically impossible weight before it ever reaches the database", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const result = await addVital({ kind: "weight", measuredOn: "2026-09-14", value1: 900 });
    expect(result).toMatchObject({ ok: false, field: "value1" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts a weight reading scoped to the authenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    single.mockResolvedValue({ data: { id: "v1", kind: "weight", value_1: 62.5 }, error: null });

    const result = await addVital({ kind: "weight", measuredOn: "2026-09-14", value1: 62.5 });

    expect(from).toHaveBeenCalledWith("vitals");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", kind: "weight", measured_on: "2026-09-14", value_1: 62.5, value_2: null }),
    );
    expect(result).toEqual({ ok: true, vital: { id: "v1", kind: "weight", value_1: 62.5 } });
  });

  it("inserts a blood-pressure reading with both numbers", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    single.mockResolvedValue({ data: { id: "v2", kind: "bp" }, error: null });

    await addVital({ kind: "bp", measuredOn: "2026-09-14", value1: 118, value2: 76 });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ kind: "bp", value_1: 118, value_2: 76 }));
  });

  it("still saves a clinically notable but plausible blood-pressure reading, carrying the note key", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    single.mockResolvedValue({ data: { id: "v3", kind: "bp" }, error: null });

    const result = await addVital({ kind: "bp", measuredOn: "2026-09-14", value1: 165, value2: 105 });

    expect(insert).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, warnKey: "vitals.notes.bpNotable" });
  });

  it("revalidates the vitals screen, the care hub and the visit summary on success", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    single.mockResolvedValue({ data: { id: "v1" }, error: null });

    await addVital({ kind: "weight", measuredOn: "2026-09-14", value1: 62 });

    expect(revalidatePath).toHaveBeenCalledWith("/care/vitals");
    expect(revalidatePath).toHaveBeenCalledWith("/care");
    expect(revalidatePath).toHaveBeenCalledWith("/care/summary");
  });

  it("surfaces a database error rather than throwing", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    single.mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await addVital({ kind: "weight", measuredOn: "2026-09-14", value1: 62 });
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});
