"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  cancelReportUpload,
  confirmReportUpload,
  startReportUpload,
  type StartReportUploadResult,
} from "@/app/actions/reports";
import { track } from "@/components/AnalyticsProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EVENTS } from "@/lib/analytics/events";
import {
  REPORT_ALLOWED_MIME_TYPES,
  REPORT_MAX_SIZE_BYTES,
  assessPhotoQuality,
  looksLikeDuplicate,
  mimeGroup,
  sizeBucket,
  validateReportFile,
  type ReportFileValidationReason,
  type ReportRecord,
} from "@/lib/domain/reports";
import { todayInAppZone } from "@/lib/domain/dates";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useOnline } from "@/lib/pwa/useOnline";

const ACCEPT = REPORT_ALLOWED_MIME_TYPES.join(",");

type UploadFileFn = (path: string, file: File) => Promise<{ ok: true } | { ok: false; error: string }>;

async function defaultUploadFile(path: string, file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.storage.from("reports").upload(path, file, { contentType: file.type });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type Step = "photo" | "quality" | "duplicate" | "fields";

export interface ReportCaptureProps {
  existingReports: Array<{ sizeBytes: number; mimeType: string }>;
  onStart?: typeof startReportUpload;
  onConfirm?: typeof confirmReportUpload;
  onCancelUpload?: typeof cancelReportUpload;
  onUploaded: (report: ReportRecord) => void;
  onClose: () => void;
  uploadFile?: UploadFileFn;
}

export function ReportCapture({
  existingReports,
  onStart = startReportUpload,
  onConfirm = confirmReportUpload,
  onCancelUpload = cancelReportUpload,
  onUploaded,
  onClose,
  uploadFile = defaultUploadFile,
}: ReportCaptureProps) {
  const t = useTranslations("reports");
  const online = useOnline();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const [step, setStep] = useState<Step>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [reportDate, setReportDate] = useState(todayInAppZone());
  const [errors, setErrors] = useState<{ title?: string; reportDate?: string }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function fileErrorMessage(reason: ReportFileValidationReason): string {
    if (reason === "type") return t("errors.fileType");
    if (reason === "size") return t("errors.fileSize", { max: Math.floor(REPORT_MAX_SIZE_BYTES / 1024 / 1024) });
    return t("errors.fileEmpty");
  }

  function resetToPhotoStep() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setStep("photo");
  }

  function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
    if (!online) {
      // Refused, not queued -- same reasoning as Kick Counter's offline tap
      // (Important/Implementation.md Session 21, step 4): a durable offline
      // queue doesn't exist, and a report is exactly the kind of thing that
      // must not be silently lost if the PWA closes before it syncs.
      track(EVENTS.offline_write_blocked, { feature: "report" });
      return;
    }
    ref.current?.click();
  }

  function handleFilePicked(picked: File | undefined) {
    if (!picked) return;
    setFileError(null);
    setUploadError(null);

    const validated = validateReportFile({ name: picked.name, type: picked.type, size: picked.size });
    if (!validated.ok) {
      setFileError(fileErrorMessage(validated.reason));
      return;
    }

    setFile(picked);
    setPreviewUrl(validated.mimeGroup === "image" ? URL.createObjectURL(picked) : null);
    advancePastQualityAndDuplicate(picked, validated.mimeGroup);
  }

  function advancePastQualityAndDuplicate(picked: File, group: "image" | "pdf") {
    if (group === "image" && assessPhotoQuality({ mimeGroup: group, sizeBytes: picked.size }) === "unclear") {
      setStep("quality");
      return;
    }
    checkDuplicateThenAdvance(picked);
  }

  function checkDuplicateThenAdvance(picked: File) {
    if (looksLikeDuplicate({ sizeBytes: picked.size, mimeType: picked.type }, existingReports)) {
      setStep("duplicate");
      return;
    }
    setStep("fields");
  }

  async function submit() {
    if (savingRef.current || !file) return;
    if (!online) {
      track(EVENTS.offline_write_blocked, { feature: "report" });
      return;
    }

    const trimmedTitle = title.trim();
    const fieldErrors: { title?: string; reportDate?: string } = {};
    if (!trimmedTitle) fieldErrors.title = t("errors.titleEmpty");
    if (!reportDate) fieldErrors.reportDate = t("errors.dateRequired");
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    savingRef.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const started: StartReportUploadResult = await onStart({
        title: trimmedTitle,
        reportDate,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!started.ok) {
        if ("errors" in started) {
          setErrors({
            ...(started.errors.title ? { title: t("errors.titleEmpty") } : {}),
            ...(started.errors.reportDate ? { reportDate: t("errors.dateRequired") } : {}),
          });
        } else {
          setUploadError(t("errors.save"));
        }
        return;
      }

      const uploaded = await uploadFile(started.path, file);
      if (!uploaded.ok) {
        await onCancelUpload({ reportId: started.report.id });
        setUploadError(t("errors.uploadFailed"));
        return;
      }

      await onConfirm();
      track(EVENTS.report_uploaded, {
        mime_group: mimeGroup(file.type),
        size_bucket: sizeBucket(file.size),
      });
      onUploaded(started.report);
    } finally {
      savingRef.current = false;
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      {!online && (
        <p role="status" className="rounded-sm bg-surface px-md py-sm text-body-sm text-text-secondary">
          {t("offline")}
        </p>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="sr-only"
        onChange={(event) => handleFilePicked(event.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => handleFilePicked(event.target.files?.[0])}
      />

      {step === "photo" && (
        <div className="flex flex-col gap-md">
          <p className="text-body-sm text-text-secondary">{t("photoStepSubtitle")}</p>
          <div className="flex gap-sm">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => openPicker(cameraInputRef)}>
              {t("camera")}
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => openPicker(galleryInputRef)}>
              {t("gallery")}
            </Button>
          </div>
          {fileError && (
            <p role="alert" className="text-body-sm text-alert">
              {fileError}
            </p>
          )}
        </div>
      )}

      {step === "quality" && (
        <div className="flex flex-col gap-md">
          <p className="text-body font-semibold text-text-primary">{t("qualityTitle")}</p>
          <p className="text-body-sm text-text-secondary">{t("qualitySubtitle")}</p>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview URL, not a static asset.
            <img src={previewUrl} alt="" className="h-[180px] w-full rounded-md object-cover" />
          )}
          <div className="flex flex-wrap gap-sm">
            <Button type="button" onClick={resetToPhotoStep}>
              {t("retake")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => file && checkDuplicateThenAdvance(file)}>
              {t("useAnyway")}
            </Button>
          </div>
        </div>
      )}

      {step === "duplicate" && (
        <div className="flex flex-col gap-md">
          <p className="text-body font-semibold text-text-primary">{t("duplicateTitle")}</p>
          <p className="text-body-sm text-text-secondary">{t("duplicateSubtitle")}</p>
          <div className="flex flex-wrap gap-sm">
            <Button type="button" variant="secondary" onClick={resetToPhotoStep}>
              {t("chooseDifferent")}
            </Button>
            <Button type="button" onClick={() => setStep("fields")}>
              {t("saveAnyway")}
            </Button>
          </div>
        </div>
      )}

      {step === "fields" && (
        <div className="flex flex-col gap-md">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview URL, not a static asset.
            <img src={previewUrl} alt="" className="h-[140px] w-full rounded-md object-cover" />
          )}
          <Input
            id="report-title"
            label={t("reportTypeLabel")}
            placeholder={t("reportTypePlaceholder")}
            value={title}
            {...(errors.title ? { error: errors.title } : {})}
            onChange={(event) => {
              setTitle(event.target.value);
              setErrors({});
            }}
          />
          <div className="flex flex-col gap-xs">
            <label htmlFor="report-date" className="text-body-sm text-text-secondary">
              {t("dateLabel")}
            </label>
            <input
              id="report-date"
              type="date"
              value={reportDate}
              onChange={(event) => {
                setReportDate(event.target.value);
                setErrors({});
              }}
              className="min-h-[48px] rounded-sm border border-divider bg-surface px-md py-sm text-body"
            />
            {errors.reportDate && <p className="text-caption text-alert">{errors.reportDate}</p>}
          </div>

          {uploadError && (
            <p role="alert" className="text-body-sm text-alert">
              {uploadError}
            </p>
          )}

          <div className="mt-sm flex gap-sm">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t("cancel")}
            </Button>
            <Button
              type="button"
              loading={uploading}
              disabled={!online || uploading}
              {...(!online ? { disabledReason: t("offline") } : {})}
              onClick={() => void submit()}
              className="flex-1"
            >
              {uploadError ? t("retryUpload") : t("saveReport")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
