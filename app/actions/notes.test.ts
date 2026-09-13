// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabase,
  from,
  getUser,
  insert,
  insertSelect,
  insertSingle,
  revalidatePath,
  update,
  updateFirstEq,
  updateSecondEq,
  updateSelect,
  updateMaybeSingle,
  del,
  delFirstEq,
  delSecondEq,
  delSelect,
  delMaybeSingle,
} = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  insert: vi.fn(),
  insertSelect: vi.fn(),
  insertSingle: vi.fn(),
  revalidatePath: vi.fn(),
  update: vi.fn(),
  updateFirstEq: vi.fn(),
  updateSecondEq: vi.fn(),
  updateSelect: vi.fn(),
  updateMaybeSingle: vi.fn(),
  del: vi.fn(),
  delFirstEq: vi.fn(),
  delSecondEq: vi.fn(),
  delSelect: vi.fn(),
  delMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { createNote, deleteNote, updateNote } from "@/app/actions/notes";

const noteRow = {
  id: "10000000-0000-4000-8000-000000000001",
  body: "Felt the first kick today",
  created_at: "2026-09-13T10:00:00Z",
  updated_at: "2026-09-13T10:00:00Z",
};

beforeEach(() => {
  for (const mock of [
    createServerSupabase,
    from,
    getUser,
    insert,
    insertSelect,
    insertSingle,
    revalidatePath,
    update,
    updateFirstEq,
    updateSecondEq,
    updateSelect,
    updateMaybeSingle,
    del,
    delFirstEq,
    delSecondEq,
    delSelect,
    delMaybeSingle,
  ]) mock.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
  insertSingle.mockResolvedValue({ data: noteRow, error: null });
  insertSelect.mockReturnValue({ single: insertSingle });
  insert.mockReturnValue({ select: insertSelect });
  updateMaybeSingle.mockResolvedValue({ data: noteRow, error: null });
  updateSelect.mockReturnValue({ maybeSingle: updateMaybeSingle });
  updateSecondEq.mockReturnValue({ select: updateSelect });
  updateFirstEq.mockReturnValue({ eq: updateSecondEq });
  update.mockReturnValue({ eq: updateFirstEq });
  delMaybeSingle.mockResolvedValue({ data: { id: noteRow.id }, error: null });
  delSelect.mockReturnValue({ maybeSingle: delMaybeSingle });
  delSecondEq.mockReturnValue({ select: delSelect });
  delFirstEq.mockReturnValue({ eq: delSecondEq });
  del.mockReturnValue({ eq: delFirstEq });
  from.mockImplementation((table: string) => {
    if (table === "personal_notes") return { insert, update, delete: del };
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("createNote", () => {
  it("returns a field error before authentication for an invalid body", async () => {
    await expect(createNote({ body: "   " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires an authenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(createNote({ body: "A thought" })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("derives ownership on the server and trims the body", async () => {
    await expect(createNote({ body: "  Felt the first kick today  " })).resolves.toMatchObject({
      ok: true,
      note: { body: "Felt the first kick today" },
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "auth-user",
      body: "Felt the first kick today",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/care/notes");
  });

  it("returns a calm error for a failed write", async () => {
    insertSingle.mockResolvedValueOnce({ data: null, error: { message: "write failed" } });
    await expect(createNote({ body: "A thought" })).resolves.toEqual({
      ok: false,
      error: "write failed",
    });
  });
});

describe("updateNote", () => {
  it("validates both fields before authentication", async () => {
    await expect(updateNote({ noteId: "not-an-id", body: "Hello" })).resolves.toEqual({
      ok: false,
      errors: { noteId: "invalid" },
    });
    await expect(updateNote({ noteId: noteRow.id, body: " " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("updates the existing owned row with a trimmed body", async () => {
    await expect(updateNote({ noteId: noteRow.id, body: "  A new thought.  " })).resolves.toMatchObject({ ok: true });
    expect(update).toHaveBeenCalledWith({ body: "A new thought." });
    expect(updateFirstEq).toHaveBeenCalledWith("id", noteRow.id);
    expect(updateSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
  });

  it("does not turn an inaccessible id into an exception", async () => {
    updateMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(updateNote({ noteId: noteRow.id, body: "A new thought." })).resolves.toEqual({
      ok: false,
      error: "note_not_found",
    });
  });
});

describe("deleteNote", () => {
  it("validates the id before authentication", async () => {
    await expect(deleteNote({ noteId: "not-an-id" })).resolves.toEqual({
      ok: false,
      errors: { noteId: "invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires an authenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(deleteNote({ noteId: noteRow.id })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("deletes the owned row and revalidates the notes page", async () => {
    await expect(deleteNote({ noteId: noteRow.id })).resolves.toEqual({ ok: true });
    expect(delFirstEq).toHaveBeenCalledWith("id", noteRow.id);
    expect(delSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
    expect(revalidatePath).toHaveBeenCalledWith("/care/notes");
  });

  it("does not turn an inaccessible id into an exception", async () => {
    delMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(deleteNote({ noteId: noteRow.id })).resolves.toEqual({
      ok: false,
      error: "note_not_found",
    });
  });
});
