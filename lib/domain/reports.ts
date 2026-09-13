export const REPORT_MAX_SIZE_BYTES = 20 * 1024 * 1024; // matches the storage bucket's own ceiling
export const REPORT_TITLE_MAX_LENGTH = 140;

export const REPORT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export type ReportMimeGroup = "image" | "pdf";

export function mimeGroup(mimeType: string): ReportMimeGroup {
  return mimeType === "application/pdf" ? "pdf" : "image";
}

export type ReportFileValidationReason = "type" | "size" | "empty";

export type ReportFileValidationResult =
  | { ok: true; mimeGroup: ReportMimeGroup }
  | { ok: false; reason: ReportFileValidationReason };

// `name` isn't read here -- it's part of the signature so a caller can spread
// a real File object (`{name, type, size}`) straight in, matching the browser
// API shape, even though only type and size drive today's validation.
export function validateReportFile({
  type,
  size,
}: {
  name: string;
  type: string;
  size: number;
}): ReportFileValidationResult {
  if (size <= 0) return { ok: false, reason: "empty" };
  if (!(REPORT_ALLOWED_MIME_TYPES as readonly string[]).includes(type)) return { ok: false, reason: "type" };
  if (size > REPORT_MAX_SIZE_BYTES) return { ok: false, reason: "size" };
  return { ok: true, mimeGroup: mimeGroup(type) };
}

/**
 * Object storage paths, not display names: strips path separators (so a
 * crafted filename can never break out of {userId}/{reportId}/), strips
 * leading dots, collapses whitespace, and truncates to a sane length. Never
 * transliterates -- a Devanagari filename stays Devanagari -- and never
 * returns an empty string, since an empty final path segment is invalid.
 */
export function sanitiseFilename(name: string): string {
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < trimmed.length - 1;
  const extension = hasExtension ? trimmed.slice(lastDot) : "";
  const rawBase = hasExtension ? trimmed.slice(0, lastDot) : trimmed;

  const cleanedBase = rawBase
    .replace(/[\\/]/g, "-")
    .replace(/^\.+/, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${cleanedBase || "report"}${extension}`;
}

/** The path shape matters: the storage policy authorises on the first
 * segment, so a bug here is a security bug -- see storage policies in
 * supabase/migrations/0004_care.sql. */
export function storagePath({
  userId,
  reportId,
  filename,
}: {
  userId: string;
  reportId: string;
  filename: string;
}): string {
  return `${userId}/${reportId}/${filename}`;
}

export type ReportSizeBucket = "small" | "medium" | "large";

export function sizeBucket(bytes: number): ReportSizeBucket {
  if (bytes < 1_000_000) return "small";
  if (bytes < 8_000_000) return "medium";
  return "large";
}

/** A genuinely small file size for a photo usually means low resolution or
 * heavy compression -- both make a report hard to read later. This is the
 * "small" and, loosely, "blurry" signal from the design's retake prompt; a
 * true blur/darkness measurement would need to decode pixels (jsdom's canvas
 * doesn't support that, and it isn't needed for a useful heuristic here).
 * PDFs are never flagged -- the prompt is about photo capture quality. */
export const UNCLEAR_PHOTO_MAX_BYTES = 60_000;

export function assessPhotoQuality({
  mimeGroup: group,
  sizeBytes,
}: {
  mimeGroup: ReportMimeGroup;
  sizeBytes: number;
}): "clear" | "unclear" {
  if (group !== "image") return "clear";
  return sizeBytes < UNCLEAR_PHOTO_MAX_BYTES ? "unclear" : "clear";
}

/** A byte-identical size and type to an already-uploaded report is a strong
 * signal of a re-picked duplicate photo, without reading either file's
 * content or storing any new fingerprint. */
export function looksLikeDuplicate(
  file: { sizeBytes: number; mimeType: string },
  existing: Array<{ sizeBytes: number; mimeType: string }>,
): boolean {
  return existing.some((report) => report.sizeBytes === file.sizeBytes && report.mimeType === file.mimeType);
}

export type ReportTitleValidationError = "invalid" | "empty" | "too_long";

export type ReportTitleValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: ReportTitleValidationError };

export function validateReportTitle(title: unknown): ReportTitleValidationResult {
  if (typeof title !== "string") return { ok: false, error: "invalid" };
  const value = title.trim();
  if (!value) return { ok: false, error: "empty" };
  if (value.length > REPORT_TITLE_MAX_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, value };
}

export interface ReportRecord {
  id: string;
  title: string;
  reportType: string | null;
  reportDate: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  createdAt: string;
}

export function sortReportsByDate(reports: ReportRecord[]): ReportRecord[] {
  return [...reports].sort((a, b) => {
    const byDate = b.reportDate.localeCompare(a.reportDate);
    if (byDate !== 0) return byDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
