// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabase,
  deleteFavorite,
  deleteFirstEq,
  favoriteInsert,
  from,
  getUser,
  maybeSingle,
  revalidatePath,
  update,
  updateEq,
} = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  deleteFavorite: vi.fn(),
  deleteFirstEq: vi.fn(),
  favoriteInsert: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { saveBabyNames, setBabyNameFavorite } from "@/app/actions/babyName";

const catalogId = "20000000-0000-4000-8000-000000000001";

beforeEach(() => {
  for (const mock of [createServerSupabase, deleteFavorite, deleteFirstEq, favoriteInsert, from, getUser, maybeSingle, revalidatePath, update, updateEq]) {
    mock.mockReset();
  }

  maybeSingle.mockResolvedValue({ data: { id: "pregnancy-1", pregnancy_flags: [] }, error: null });
  updateEq.mockResolvedValue({ error: null });
  update.mockReturnValue({ eq: updateEq });
  favoriteInsert.mockResolvedValue({ error: null });
  deleteFirstEq.mockReturnValue({ eq: deleteFavorite });
  deleteFavorite.mockResolvedValue({ error: null });
  from.mockImplementation((table: string) => {
    if (table === "pregnancies") {
      return {
        select: () => ({ eq: () => ({ maybeSingle }) }),
        update,
      };
    }
    if (table === "baby_name_favorites") {
      return {
        insert: favoriteInsert,
        delete: () => ({ eq: deleteFirstEq }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("saveBabyNames", () => {
  it("returns a field error before auth or database access for invalid input", async () => {
    await expect(saveBabyNames({ names: [" "] })).resolves.toEqual({ ok: false, errors: { names: "empty" } });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires authentication and never writes for a signed-out caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(saveBabyNames({ names: ["Aditi"] })).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("writes trimmed names to the authenticated user's active pregnancy", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    await expect(saveBabyNames({ names: ["  Aditi  "] })).resolves.toEqual({ ok: true, names: ["Aditi"] });
    expect(update).toHaveBeenCalledWith({ baby_name: ["Aditi"] });
    expect(updateEq).toHaveBeenCalledWith("id", "pregnancy-1");
    expect(revalidatePath).toHaveBeenCalledWith("/baby/name");
  });

  it("allows two names only when the active pregnancy is marked for twins", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    await expect(saveBabyNames({ names: ["Aditi", "Noor"] })).resolves.toEqual({ ok: false, errors: { names: "too_many" } });
    expect(update).not.toHaveBeenCalled();

    maybeSingle.mockResolvedValue({ data: { id: "pregnancy-1", pregnancy_flags: ["twins"] }, error: null });
    await expect(saveBabyNames({ names: ["Aditi", "Noor"] })).resolves.toEqual({ ok: true, names: ["Aditi", "Noor"] });
  });

  it("returns a calm error code when no active pregnancy exists or a write fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(saveBabyNames({ names: ["Aditi"] })).resolves.toEqual({ ok: false, error: "pregnancy_not_found" });

    maybeSingle.mockResolvedValueOnce({ data: { id: "pregnancy-1", pregnancy_flags: [] }, error: null });
    updateEq.mockResolvedValueOnce({ error: { message: "write failed" } });
    await expect(saveBabyNames({ names: ["Aditi"] })).resolves.toEqual({ ok: false, error: "write failed" });
  });
});

describe("setBabyNameFavorite", () => {
  it("returns a field error for a malformed catalog id before auth", async () => {
    await expect(setBabyNameFavorite({ babyNameId: "not-an-id", favorite: true })).resolves.toEqual({
      ok: false,
      errors: { babyNameId: "invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns a field error for a malformed favorite state before auth", async () => {
    await expect(
      setBabyNameFavorite({ babyNameId: catalogId, favorite: "yes" as unknown as boolean }),
    ).resolves.toEqual({ ok: false, errors: { favorite: "invalid" } });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("inserts and removes a favorite for the authenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    await expect(setBabyNameFavorite({ babyNameId: catalogId, favorite: true })).resolves.toEqual({ ok: true });
    expect(favoriteInsert).toHaveBeenCalledWith({ user_id: "auth-user", baby_name_id: catalogId });

    await expect(setBabyNameFavorite({ babyNameId: catalogId, favorite: false })).resolves.toEqual({ ok: true });
    expect(deleteFirstEq).toHaveBeenCalledWith("user_id", "auth-user");
    expect(deleteFavorite).toHaveBeenCalledWith("baby_name_id", catalogId);
  });

  it("requires authentication and returns database errors instead of throwing", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(setBabyNameFavorite({ babyNameId: catalogId, favorite: true })).resolves.toEqual({ ok: false, error: "not_authenticated" });

    getUser.mockResolvedValueOnce({ data: { user: { id: "auth-user" } } });
    favoriteInsert.mockResolvedValueOnce({ error: { message: "write failed" } });
    await expect(setBabyNameFavorite({ babyNameId: catalogId, favorite: true })).resolves.toEqual({ ok: false, error: "write failed" });
  });
});
