// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabase,
  from,
  getUser,
  revalidatePath,
  storageFrom,
  storageRemove,
  storageCreateSignedUrl,
  reportsInsert,
  reportsInsertSelect,
  reportsInsertSingle,
  reportsUpdate,
  reportsUpdateFirstEq,
  reportsUpdateSecondEq,
  reportsUpdateSelect,
  reportsUpdateMaybeSingle,
  reportsDelete,
  reportsDeleteFirstEq,
  reportsDeleteSecondEq,
  reportsSelect,
  reportsSelectFirstEq,
  reportsSelectSecondEq,
  reportsSelectMaybeSingle,
} = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  revalidatePath: vi.fn(),
  storageFrom: vi.fn(),
  storageRemove: vi.fn(),
  storageCreateSignedUrl: vi.fn(),
  reportsInsert: vi.fn(),
  reportsInsertSelect: vi.fn(),
  reportsInsertSingle: vi.fn(),
  reportsUpdate: vi.fn(),
  reportsUpdateFirstEq: vi.fn(),
  reportsUpdateSecondEq: vi.fn(),
  reportsUpdateSelect: vi.fn(),
  reportsUpdateMaybeSingle: vi.fn(),
  reportsDelete: vi.fn(),
  reportsDeleteFirstEq: vi.fn(),
  reportsDeleteSecondEq: vi.fn(),
  reportsSelect: vi.fn(),
  reportsSelectFirstEq: vi.fn(),
  reportsSelectSecondEq: vi.fn(),
  reportsSelectMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  cancelReportUpload,
  confirmReportUpload,
  deleteReport,
  signedReportUrl,
  startReportUpload,
  updateReportMetadata,
} from "@/app/actions/reports";

const reportId = "10000000-0000-4000-8000-000000000001";
const reportRow = {
  id: reportId,
  title: "Ultrasound scan",
  report_type: "Ultrasound scan",
  report_date: "2026-09-13",
  mime_type: "image/jpeg",
  size_bytes: 512000,
  page_count: null,
  created_at: "2026-09-13T10:00:00Z",
};

beforeEach(() => {
  for (const mock of [
    createServerSupabase, from, getUser, revalidatePath,
    storageFrom, storageRemove, storageCreateSignedUrl,
    reportsInsert, reportsInsertSelect, reportsInsertSingle,
    reportsUpdate, reportsUpdateFirstEq, reportsUpdateSecondEq, reportsUpdateSelect, reportsUpdateMaybeSingle,
    reportsDelete, reportsDeleteFirstEq, reportsDeleteSecondEq,
    reportsSelect, reportsSelectFirstEq, reportsSelectSecondEq, reportsSelectMaybeSingle,
  ]) mock.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

  reportsInsertSingle.mockResolvedValue({ data: reportRow, error: null });
  reportsInsertSelect.mockReturnValue({ single: reportsInsertSingle });
  reportsInsert.mockReturnValue({ select: reportsInsertSelect });

  reportsUpdateMaybeSingle.mockResolvedValue({ data: reportRow, error: null });
  reportsUpdateSelect.mockReturnValue({ maybeSingle: reportsUpdateMaybeSingle });
  reportsUpdateSecondEq.mockReturnValue({ select: reportsUpdateSelect });
  reportsUpdateFirstEq.mockReturnValue({ eq: reportsUpdateSecondEq });
  reportsUpdate.mockReturnValue({ eq: reportsUpdateFirstEq });

  reportsDeleteSecondEq.mockResolvedValue({ error: null });
  reportsDeleteFirstEq.mockReturnValue({ eq: reportsDeleteSecondEq });
  reportsDelete.mockReturnValue({ eq: reportsDeleteFirstEq });

  reportsSelectMaybeSingle.mockResolvedValue({ data: { id: reportId, storage_path: "auth-user/r1/scan.jpg" }, error: null });
  reportsSelectSecondEq.mockReturnValue({ maybeSingle: reportsSelectMaybeSingle });
  reportsSelectFirstEq.mockReturnValue({ eq: reportsSelectSecondEq });
  reportsSelect.mockReturnValue({ eq: reportsSelectFirstEq });

  storageRemove.mockResolvedValue({ error: null });
  storageCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.com/signed" }, error: null });
  storageFrom.mockReturnValue({ remove: storageRemove, createSignedUrl: storageCreateSignedUrl });

  from.mockImplementation((table: string) => {
    if (table === "reports") return { insert: reportsInsert, update: reportsUpdate, delete: reportsDelete, select: reportsSelect };
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from, storage: { from: storageFrom } });
});

describe("startReportUpload", () => {
  it("returns field errors before authentication", async () => {
    await expect(
      startReportUpload({ title: "   ", reportDate: "2026-09-13", fileName: "x.jpg", mimeType: "image/jpeg", sizeBytes: 1000 }),
    ).resolves.toEqual({ ok: false, errors: { title: "empty" } });

    await expect(
      startReportUpload({ title: "Scan", reportDate: "not-a-date", fileName: "x.jpg", mimeType: "image/jpeg", sizeBytes: 1000 }),
    ).resolves.toEqual({ ok: false, errors: { reportDate: "invalid" } });

    await expect(
      startReportUpload({ title: "Scan", reportDate: "2026-09-13", fileName: "x.gif", mimeType: "image/gif", sizeBytes: 1000 }),
    ).resolves.toEqual({ ok: false, errors: { file: "type" } });

    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires an authenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(
      startReportUpload({ title: "Scan", reportDate: "2026-09-13", fileName: "x.jpg", mimeType: "image/jpeg", sizeBytes: 1000 }),
    ).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("generates the report id and its storage path together, and inserts both in one row", async () => {
    const result = await startReportUpload({
      title: "  Ultrasound scan  ",
      reportDate: "2026-09-13",
      fileName: "IMG 001.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 512000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.report).toEqual({
      id: reportId,
      title: "Ultrasound scan",
      reportType: "Ultrasound scan",
      reportDate: "2026-09-13",
      mimeType: "image/jpeg",
      sizeBytes: 512000,
      pageCount: null,
      createdAt: "2026-09-13T10:00:00Z",
    });
    expect(result.path).toMatch(/^auth-user\/[0-9a-f-]{36}\/IMG-001\.jpg$/);

    const insertedRow = reportsInsert.mock.calls[0]![0];
    expect(insertedRow).toMatchObject({
      user_id: "auth-user",
      title: "Ultrasound scan",
      report_type: "Ultrasound scan",
      report_date: "2026-09-13",
      mime_type: "image/jpeg",
      size_bytes: 512000,
    });
    expect(insertedRow.storage_path).toBe(result.path);
    expect(insertedRow.id).toBe(insertedRow.storage_path.split("/")[1]);
  });

  it("returns a calm error for a failed write", async () => {
    reportsInsertSingle.mockResolvedValueOnce({ data: null, error: { message: "write failed" } });
    await expect(
      startReportUpload({ title: "Scan", reportDate: "2026-09-13", fileName: "x.jpg", mimeType: "image/jpeg", sizeBytes: 1000 }),
    ).resolves.toEqual({ ok: false, error: "write failed" });
  });
});

describe("confirmReportUpload", () => {
  it("just revalidates the reports page", async () => {
    await expect(confirmReportUpload()).resolves.toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/care/reports");
  });
});

describe("cancelReportUpload", () => {
  it("deletes the orphan metadata row for the owned report", async () => {
    await expect(cancelReportUpload({ reportId })).resolves.toEqual({ ok: true });
    expect(reportsDeleteFirstEq).toHaveBeenCalledWith("id", reportId);
    expect(reportsDeleteSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
  });

  it("validates the id before authentication", async () => {
    await expect(cancelReportUpload({ reportId: "not-an-id" })).resolves.toEqual({ ok: false, error: "invalid_id" });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });
});

describe("deleteReport", () => {
  it("removes the storage object and the row together", async () => {
    await expect(deleteReport({ reportId })).resolves.toEqual({ ok: true });
    expect(storageFrom).toHaveBeenCalledWith("reports");
    expect(storageRemove).toHaveBeenCalledWith(["auth-user/r1/scan.jpg"]);
    expect(reportsDeleteFirstEq).toHaveBeenCalledWith("id", reportId);
    expect(revalidatePath).toHaveBeenCalledWith("/care/reports");
  });

  it("does not turn an inaccessible report into an exception", async () => {
    reportsSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(deleteReport({ reportId })).resolves.toEqual({ ok: false, error: "report_not_found" });
    expect(storageRemove).not.toHaveBeenCalled();
  });
});

describe("updateReportMetadata", () => {
  it("validates fields before authentication", async () => {
    await expect(updateReportMetadata({ reportId: "not-an-id", title: "Scan", reportDate: "2026-09-13" })).resolves.toEqual({
      ok: false,
      errors: { reportId: "invalid" },
    });
    await expect(updateReportMetadata({ reportId, title: "  ", reportDate: "2026-09-13" })).resolves.toEqual({
      ok: false,
      errors: { title: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("updates the owned row's title, type, and date together", async () => {
    await expect(updateReportMetadata({ reportId, title: "Blood test", reportDate: "2026-09-14" })).resolves.toMatchObject({ ok: true });
    expect(reportsUpdate).toHaveBeenCalledWith({ title: "Blood test", report_type: "Blood test", report_date: "2026-09-14" });
    expect(reportsUpdateFirstEq).toHaveBeenCalledWith("id", reportId);
    expect(reportsUpdateSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
  });

  it("does not turn an inaccessible report into an exception", async () => {
    reportsUpdateMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(updateReportMetadata({ reportId, title: "Blood test", reportDate: "2026-09-14" })).resolves.toEqual({
      ok: false,
      error: "report_not_found",
    });
  });
});

describe("signedReportUrl", () => {
  it("returns a signed url valid for five minutes for the owned report", async () => {
    const result = await signedReportUrl({ reportId });
    expect(result).toMatchObject({ ok: true, url: "https://example.com/signed" });
    expect(storageCreateSignedUrl).toHaveBeenCalledWith("auth-user/r1/scan.jpg", 300);
  });

  it("does not turn an inaccessible report into an exception", async () => {
    reportsSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(signedReportUrl({ reportId })).resolves.toEqual({ ok: false, error: "report_not_found" });
  });
});
