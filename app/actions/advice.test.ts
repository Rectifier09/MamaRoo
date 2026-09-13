// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabase,
  from,
  getUser,
  revalidatePath,
  adviceInsert,
  adviceInsertSelect,
  adviceInsertSingle,
  adviceUpdate,
  adviceUpdateFirstEq,
  adviceUpdateSecondEq,
  adviceUpdateSelect,
  adviceUpdateMaybeSingle,
  adviceDelete,
  adviceDeleteEq,
  updatesInsert,
  updatesInsertSelect,
  updatesInsertSingle,
} = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  revalidatePath: vi.fn(),
  adviceInsert: vi.fn(),
  adviceInsertSelect: vi.fn(),
  adviceInsertSingle: vi.fn(),
  adviceUpdate: vi.fn(),
  adviceUpdateFirstEq: vi.fn(),
  adviceUpdateSecondEq: vi.fn(),
  adviceUpdateSelect: vi.fn(),
  adviceUpdateMaybeSingle: vi.fn(),
  adviceDelete: vi.fn(),
  adviceDeleteEq: vi.fn(),
  updatesInsert: vi.fn(),
  updatesInsertSelect: vi.fn(),
  updatesInsertSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { addAdviceUpdate, createAdvice, toggleAdviceReminder } from "@/app/actions/advice";

const adviceId = "10000000-0000-4000-8000-000000000001";
const adviceRow = { id: adviceId, type: "medicine", is_reminder: false };
const updateRow = {
  id: "20000000-0000-4000-8000-000000000001",
  body: "Continue iron and calcium tablets daily",
  doctor_name: "Dr. Priya Sharma",
  created_at: "2026-09-13T10:00:00Z",
};

beforeEach(() => {
  for (const mock of [
    createServerSupabase,
    from,
    getUser,
    revalidatePath,
    adviceInsert,
    adviceInsertSelect,
    adviceInsertSingle,
    adviceUpdate,
    adviceUpdateFirstEq,
    adviceUpdateSecondEq,
    adviceUpdateSelect,
    adviceUpdateMaybeSingle,
    adviceDelete,
    adviceDeleteEq,
    updatesInsert,
    updatesInsertSelect,
    updatesInsertSingle,
  ]) mock.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

  adviceInsertSingle.mockResolvedValue({ data: adviceRow, error: null });
  adviceInsertSelect.mockReturnValue({ single: adviceInsertSingle });
  adviceInsert.mockReturnValue({ select: adviceInsertSelect });

  adviceUpdateMaybeSingle.mockResolvedValue({ data: { id: adviceId }, error: null });
  adviceUpdateSelect.mockReturnValue({ maybeSingle: adviceUpdateMaybeSingle });
  adviceUpdateSecondEq.mockReturnValue({ select: adviceUpdateSelect });
  adviceUpdateFirstEq.mockReturnValue({ eq: adviceUpdateSecondEq });
  adviceUpdate.mockReturnValue({ eq: adviceUpdateFirstEq });

  adviceDeleteEq.mockResolvedValue({ error: null });
  adviceDelete.mockReturnValue({ eq: adviceDeleteEq });

  updatesInsertSingle.mockResolvedValue({ data: updateRow, error: null });
  updatesInsertSelect.mockReturnValue({ single: updatesInsertSingle });
  updatesInsert.mockReturnValue({ select: updatesInsertSelect });

  from.mockImplementation((table: string) => {
    if (table === "doctor_advice") return { insert: adviceInsert, update: adviceUpdate, delete: adviceDelete };
    if (table === "doctor_advice_updates") return { insert: updatesInsert };
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("createAdvice", () => {
  it("returns field errors before authentication for an invalid type or body", async () => {
    await expect(createAdvice({ type: "prescription", body: "test" })).resolves.toEqual({
      ok: false,
      errors: { type: "invalid" },
    });
    await expect(createAdvice({ type: "medicine", body: "   " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires an authenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(createAdvice({ type: "medicine", body: "Continue iron tablets" })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("creates the thread header and its first update, unconfirmed", async () => {
    await expect(
      createAdvice({ type: "medicine", body: "  Continue iron and calcium tablets daily  ", doctorName: "  Dr. Priya Sharma  " }),
    ).resolves.toEqual({
      ok: true,
      advice: {
        id: adviceId,
        type: "medicine",
        isReminder: false,
        updates: [{
          id: updateRow.id,
          body: updateRow.body,
          doctorName: updateRow.doctor_name,
          createdAt: updateRow.created_at,
        }],
      },
    });
    expect(adviceInsert).toHaveBeenCalledWith({ user_id: "auth-user", type: "medicine", is_reminder: false });
    expect(updatesInsert).toHaveBeenCalledWith({
      user_id: "auth-user",
      advice_id: adviceId,
      body: "Continue iron and calcium tablets daily",
      doctor_name: "Dr. Priya Sharma",
      input_method: "text",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/care/advice");
  });

  it("stores a missing doctor name as null, not an empty string", async () => {
    await createAdvice({ type: "medicine", body: "Continue iron tablets" });
    expect(updatesInsert).toHaveBeenCalledWith(expect.objectContaining({ doctor_name: null }));
  });

  it("cleans up the orphan thread header when the first update fails to save", async () => {
    updatesInsertSingle.mockResolvedValueOnce({ data: null, error: { message: "write failed" } });
    await expect(createAdvice({ type: "medicine", body: "Continue iron tablets" })).resolves.toEqual({
      ok: false,
      error: "write failed",
    });
    expect(adviceDelete).toHaveBeenCalled();
    expect(adviceDeleteEq).toHaveBeenCalledWith("id", adviceId);
  });
});

describe("addAdviceUpdate", () => {
  it("validates both fields before authentication", async () => {
    await expect(addAdviceUpdate({ adviceId: "not-an-id", body: "Hello" })).resolves.toEqual({
      ok: false,
      errors: { adviceId: "invalid" },
    });
    await expect(addAdviceUpdate({ adviceId, body: " " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("resets the thread to unconfirmed and appends the new update", async () => {
    await expect(addAdviceUpdate({ adviceId, body: "Switch to gentle stretching", doctorName: "Dr. Priya Sharma" })).resolves.toEqual({
      ok: true,
      isReminder: false,
      update: {
        id: updateRow.id,
        body: updateRow.body,
        doctorName: updateRow.doctor_name,
        createdAt: updateRow.created_at,
      },
    });
    expect(adviceUpdate).toHaveBeenCalledWith({ is_reminder: false });
    expect(adviceUpdateFirstEq).toHaveBeenCalledWith("id", adviceId);
    expect(adviceUpdateSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
    expect(updatesInsert).toHaveBeenCalledWith(expect.objectContaining({ advice_id: adviceId }));
  });

  it("does not turn an inaccessible thread into an exception", async () => {
    adviceUpdateMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(addAdviceUpdate({ adviceId, body: "Switch to gentle stretching" })).resolves.toEqual({
      ok: false,
      error: "advice_not_found",
    });
    expect(updatesInsert).not.toHaveBeenCalled();
  });
});

describe("toggleAdviceReminder", () => {
  it("validates the id before authentication", async () => {
    await expect(toggleAdviceReminder({ adviceId: "not-an-id", isReminder: true })).resolves.toEqual({
      ok: false,
      errors: { adviceId: "invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("flips the confirmed flag on the owned thread", async () => {
    adviceUpdateMaybeSingle.mockResolvedValueOnce({ data: { id: adviceId, is_reminder: true }, error: null });
    await expect(toggleAdviceReminder({ adviceId, isReminder: true })).resolves.toEqual({
      ok: true,
      isReminder: true,
    });
    expect(adviceUpdate).toHaveBeenCalledWith({ is_reminder: true });
  });

  it("does not turn an inaccessible thread into an exception", async () => {
    adviceUpdateMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(toggleAdviceReminder({ adviceId, isReminder: true })).resolves.toEqual({
      ok: false,
      error: "advice_not_found",
    });
  });
});
