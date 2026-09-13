"use server";

import { revalidatePath } from "next/cache";
import { isValidDateString } from "@/lib/domain/dates";
import {
  sanitiseFilename,
  storagePath,
  validateReportFile,
  validateReportTitle,
  type ReportFileValidationReason,
  type ReportRecord,
  type ReportTitleValidationError,
} from "@/lib/domain/reports";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
type ReportSelection = Pick<
  ReportRow,
  "id" | "title" | "report_type" | "report_date" | "mime_type" | "size_bytes" | "page_count" | "created_at"
>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORT_COLUMNS = "id,title,report_type,report_date,mime_type,size_bytes,page_count,created_at";
/** Same window Implementation.md's ReportViewer spec calls for -- long enough to
 * read a report, short enough that a copied link goes stale quickly. */
const SIGNED_URL_TTL_SECONDS = 300;

function toReport(row: ReportSelection): ReportRecord {
  return {
    id: row.id,
    title: row.title,
    reportType: row.report_type,
    reportDate: row.report_date,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    pageCount: row.page_count,
    createdAt: row.created_at,
  };
}

type StartReportUploadFieldErrors = {
  title?: ReportTitleValidationError;
  reportDate?: "invalid";
  file?: ReportFileValidationReason;
};

export type StartReportUploadResult =
  | { ok: true; report: ReportRecord; path: string }
  | { ok: false; errors: StartReportUploadFieldErrors }
  | { ok: false; error: string };

/**
 * Creates the metadata row and derives its storage path in one step, using a
 * server-generated id -- so the path can never name a report she doesn't own,
 * and so `storage_path` (NOT NULL) is known before the row is written at all.
 * The caller uploads the actual file to exactly this path next, with its own
 * session, so the storage RLS policy applies; see `confirmReportUpload` and
 * `cancelReportUpload` for the two ways that second step can end.
 */
export async function startReportUpload(input: {
  title: unknown;
  reportDate: unknown;
  fileName: unknown;
  mimeType: unknown;
  sizeBytes: unknown;
}): Promise<StartReportUploadResult> {
  const titleResult = validateReportTitle(input.title);
  if (!titleResult.ok) return { ok: false, errors: { title: titleResult.error } };

  if (typeof input.reportDate !== "string" || !isValidDateString(input.reportDate)) {
    return { ok: false, errors: { reportDate: "invalid" } };
  }

  if (typeof input.fileName !== "string" || typeof input.mimeType !== "string" || typeof input.sizeBytes !== "number") {
    return { ok: false, errors: { file: "type" } };
  }
  const fileResult = validateReportFile({ name: input.fileName, type: input.mimeType, size: input.sizeBytes });
  if (!fileResult.ok) return { ok: false, errors: { file: fileResult.reason } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const reportId = crypto.randomUUID();
  const path = storagePath({ userId: user.id, reportId, filename: sanitiseFilename(input.fileName) });

  const { data, error } = await supabase
    .from("reports")
    .insert({
      id: reportId,
      user_id: user.id,
      // The design mock collects one free-text field ("Report type") -- there is
      // no separate title concept in the UI, so the same value fills both
      // columns, same pragmatic choice Session 23 made for appointments' title.
      title: titleResult.value,
      report_type: titleResult.value,
      report_date: input.reportDate,
      storage_path: path,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select(REPORT_COLUMNS)
    .single();
  if (error) return { ok: false, error: error.message };

  return { ok: true, report: toReport(data), path };
}

/** Called once the client's direct-to-storage upload succeeds. Nothing here
 * needs the metadata row again -- it already reflects the truth -- this just
 * keeps the server-rendered list fresh for the next full navigation. */
export async function confirmReportUpload(): Promise<{ ok: true }> {
  revalidatePath("/care/reports");
  return { ok: true };
}

export type CancelReportUploadResult = { ok: true } | { ok: false; error: string };

/** Called when the client's direct-to-storage upload fails, so a metadata row
 * never outlives the file it was supposed to describe. */
export async function cancelReportUpload(input: { reportId: unknown }): Promise<CancelReportUploadResult> {
  if (typeof input.reportId !== "string" || !UUID.test(input.reportId)) {
    return { ok: false, error: "invalid_id" };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase.from("reports").delete().eq("id", input.reportId).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export type DeleteReportResult = { ok: true } | { ok: false; error: string };

export async function deleteReport(input: { reportId: unknown }): Promise<DeleteReportResult> {
  if (typeof input.reportId !== "string" || !UUID.test(input.reportId)) {
    return { ok: false, error: "invalid_id" };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: report, error: fetchError } = await supabase
    .from("reports")
    .select("id,storage_path")
    .eq("id", input.reportId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!report) return { ok: false, error: "report_not_found" };

  const { error: storageError } = await supabase.storage.from("reports").remove([report.storage_path]);
  if (storageError) return { ok: false, error: storageError.message };

  const { error: deleteError } = await supabase.from("reports").delete().eq("id", input.reportId).eq("user_id", user.id);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/care/reports");
  return { ok: true };
}

type UpdateReportMetadataFieldErrors = {
  reportId?: "invalid";
  title?: ReportTitleValidationError;
  reportDate?: "invalid";
};

export type UpdateReportMetadataResult =
  | { ok: true; report: ReportRecord }
  | { ok: false; errors: UpdateReportMetadataFieldErrors }
  | { ok: false; error: string };

export async function updateReportMetadata(input: {
  reportId: unknown;
  title: unknown;
  reportDate: unknown;
}): Promise<UpdateReportMetadataResult> {
  if (typeof input.reportId !== "string" || !UUID.test(input.reportId)) {
    return { ok: false, errors: { reportId: "invalid" } };
  }
  const titleResult = validateReportTitle(input.title);
  if (!titleResult.ok) return { ok: false, errors: { title: titleResult.error } };
  if (typeof input.reportDate !== "string" || !isValidDateString(input.reportDate)) {
    return { ok: false, errors: { reportDate: "invalid" } };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("reports")
    .update({ title: titleResult.value, report_type: titleResult.value, report_date: input.reportDate })
    .eq("id", input.reportId)
    .eq("user_id", user.id)
    .select(REPORT_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "report_not_found" };

  revalidatePath("/care/reports");
  return { ok: true, report: toReport(data) };
}

export type SignedReportUrlResult =
  | { ok: true; url: string; expiresAt: number }
  | { ok: false; error: string };

export async function signedReportUrl(input: { reportId: unknown }): Promise<SignedReportUrlResult> {
  if (typeof input.reportId !== "string" || !UUID.test(input.reportId)) {
    return { ok: false, error: "invalid_id" };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: report, error: fetchError } = await supabase
    .from("reports")
    .select("storage_path")
    .eq("id", input.reportId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!report) return { ok: false, error: "report_not_found" };

  const { data: signed, error: signError } = await supabase.storage
    .from("reports")
    .createSignedUrl(report.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) return { ok: false, error: signError?.message ?? "sign_failed" };

  return { ok: true, url: signed.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 };
}
