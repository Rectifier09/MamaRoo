// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabase,
  from,
  getUser,
  revalidatePath,
  insert,
  insertSelect,
  insertSingle,
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
  marksUpsert,
  marksDelete,
  marksDeleteFirstEq,
  marksDeleteSecondEq,
} = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  revalidatePath: vi.fn(),
  insert: vi.fn(),
  insertSelect: vi.fn(),
  insertSingle: vi.fn(),
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
  marksUpsert: vi.fn(),
  marksDelete: vi.fn(),
  marksDeleteFirstEq: vi.fn(),
  marksDeleteSecondEq: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  createCustomQuestion,
  deleteCustomQuestion,
  toggleCustomQuestionMark,
  toggleSuggestedQuestionMark,
  updateCustomQuestion,
} from "@/app/actions/questions";

const questionId = "10000000-0000-4000-8000-000000000001";
const questionRow = {
  id: questionId,
  body: "Can I keep travelling?",
  is_marked: false,
  created_at: "2026-09-13T10:00:00Z",
};

beforeEach(() => {
  for (const mock of [
    createServerSupabase,
    from,
    getUser,
    revalidatePath,
    insert,
    insertSelect,
    insertSingle,
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
    marksUpsert,
    marksDelete,
    marksDeleteFirstEq,
    marksDeleteSecondEq,
  ])
    mock.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

  insertSingle.mockResolvedValue({ data: questionRow, error: null });
  insertSelect.mockReturnValue({ single: insertSingle });
  insert.mockReturnValue({ select: insertSelect });

  updateMaybeSingle.mockResolvedValue({ data: questionRow, error: null });
  updateSelect.mockReturnValue({ maybeSingle: updateMaybeSingle });
  updateSecondEq.mockReturnValue({ select: updateSelect });
  updateFirstEq.mockReturnValue({ eq: updateSecondEq });
  update.mockReturnValue({ eq: updateFirstEq });

  delMaybeSingle.mockResolvedValue({ data: { id: questionId }, error: null });
  delSelect.mockReturnValue({ maybeSingle: delMaybeSingle });
  delSecondEq.mockReturnValue({ select: delSelect });
  delFirstEq.mockReturnValue({ eq: delSecondEq });
  del.mockReturnValue({ eq: delFirstEq });

  marksUpsert.mockResolvedValue({ error: null });
  marksDeleteSecondEq.mockResolvedValue({ error: null });
  marksDeleteFirstEq.mockReturnValue({ eq: marksDeleteSecondEq });
  marksDelete.mockReturnValue({ eq: marksDeleteFirstEq });

  from.mockImplementation((table: string) => {
    if (table === "custom_questions") return { insert, update, delete: del };
    if (table === "question_marks") return { upsert: marksUpsert, delete: marksDelete };
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("createCustomQuestion", () => {
  it("returns a field error before authentication for an invalid body", async () => {
    await expect(createCustomQuestion({ body: "   " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires an authenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(createCustomQuestion({ body: "Can I keep travelling?" })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("derives ownership on the server and trims the body", async () => {
    await expect(createCustomQuestion({ body: "  Can I keep travelling?  " })).resolves.toMatchObject({
      ok: true,
      question: { kind: "custom", text: "Can I keep travelling?" },
    });
    expect(insert).toHaveBeenCalledWith({ user_id: "auth-user", body: "Can I keep travelling?" });
    expect(revalidatePath).toHaveBeenCalledWith("/care/questions");
  });

  it("returns a calm error for a failed write", async () => {
    insertSingle.mockResolvedValueOnce({ data: null, error: { message: "write failed" } });
    await expect(createCustomQuestion({ body: "Can I keep travelling?" })).resolves.toEqual({
      ok: false,
      error: "write failed",
    });
  });
});

describe("updateCustomQuestion", () => {
  it("validates both fields before authentication", async () => {
    await expect(updateCustomQuestion({ questionId: "not-an-id", body: "Hello" })).resolves.toEqual({
      ok: false,
      errors: { questionId: "invalid" },
    });
    await expect(updateCustomQuestion({ questionId, body: " " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("updates the existing owned row with a trimmed body", async () => {
    await expect(updateCustomQuestion({ questionId, body: "  A new question.  " })).resolves.toMatchObject({
      ok: true,
    });
    expect(update).toHaveBeenCalledWith({ body: "A new question." });
    expect(updateFirstEq).toHaveBeenCalledWith("id", questionId);
    expect(updateSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
  });

  it("does not turn an inaccessible id into an exception", async () => {
    updateMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(updateCustomQuestion({ questionId, body: "A new question." })).resolves.toEqual({
      ok: false,
      error: "question_not_found",
    });
  });
});

describe("deleteCustomQuestion", () => {
  it("validates the id before authentication", async () => {
    await expect(deleteCustomQuestion({ questionId: "not-an-id" })).resolves.toEqual({
      ok: false,
      errors: { questionId: "invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("deletes the owned row and revalidates the questions page", async () => {
    await expect(deleteCustomQuestion({ questionId })).resolves.toEqual({ ok: true });
    expect(delFirstEq).toHaveBeenCalledWith("id", questionId);
    expect(delSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
    expect(revalidatePath).toHaveBeenCalledWith("/care/questions");
  });

  it("does not turn an inaccessible id into an exception", async () => {
    delMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(deleteCustomQuestion({ questionId })).resolves.toEqual({
      ok: false,
      error: "question_not_found",
    });
  });
});

describe("toggleCustomQuestionMark", () => {
  it("validates the id before authentication", async () => {
    await expect(toggleCustomQuestionMark({ questionId: "not-an-id", marked: true })).resolves.toEqual({
      ok: false,
      errors: { questionId: "invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("updates is_marked on her own row", async () => {
    updateMaybeSingle.mockResolvedValueOnce({ data: { is_marked: true }, error: null });
    await expect(toggleCustomQuestionMark({ questionId, marked: true })).resolves.toEqual({
      ok: true,
      marked: true,
    });
    expect(update).toHaveBeenCalledWith({ is_marked: true });
    expect(updateSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
  });
});

describe("toggleSuggestedQuestionMark", () => {
  it("validates the id before authentication", async () => {
    await expect(toggleSuggestedQuestionMark({ questionId: "not-an-id", marked: true })).resolves.toEqual({
      ok: false,
      errors: { questionId: "invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("upserts a join row to mark a seeded question", async () => {
    await expect(toggleSuggestedQuestionMark({ questionId, marked: true })).resolves.toEqual({
      ok: true,
      marked: true,
    });
    expect(marksUpsert).toHaveBeenCalledWith(
      { user_id: "auth-user", suggested_question_id: questionId },
      { onConflict: "user_id,suggested_question_id", ignoreDuplicates: true },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/care/questions");
  });

  it("deletes the join row to unmark a seeded question, never an update", async () => {
    await expect(toggleSuggestedQuestionMark({ questionId, marked: false })).resolves.toEqual({
      ok: true,
      marked: false,
    });
    expect(marksDeleteFirstEq).toHaveBeenCalledWith("user_id", "auth-user");
    expect(marksDeleteSecondEq).toHaveBeenCalledWith("suggested_question_id", questionId);
  });

  it("returns a calm error for a failed write", async () => {
    marksUpsert.mockResolvedValueOnce({ error: { message: "write failed" } });
    await expect(toggleSuggestedQuestionMark({ questionId, marked: true })).resolves.toEqual({
      ok: false,
      error: "write failed",
    });
  });
});
