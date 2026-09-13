"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { deleteReport, signedReportUrl, updateReportMetadata } from "@/app/actions/reports";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { mimeGroup, validateReportTitle, type ReportRecord, type ReportTitleValidationError } from "@/lib/domain/reports";

export interface ReportViewerProps {
  report: ReportRecord;
  onSignedUrl?: typeof signedReportUrl;
  onUpdate?: typeof updateReportMetadata;
  onDelete?: typeof deleteReport;
  onUpdated: (report: ReportRecord) => void;
  onDeleted: (reportId: string) => void;
  onClose: () => void;
}

export function ReportViewer({
  report,
  onSignedUrl = signedReportUrl,
  onUpdate = updateReportMetadata,
  onDelete = deleteReport,
  onUpdated,
  onDeleted,
  onClose,
}: ReportViewerProps) {
  const t = useTranslations("reports");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [url, setUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState(false);
  const [title, setTitle] = useState(report.title);
  const [reportDate, setReportDate] = useState(report.reportDate);
  const [errors, setErrors] = useState<{ title?: string; reportDate?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // A ref, not a direct recursive call, so the timeout always invokes the
  // current closure rather than the one captured when it was scheduled.
  const loadUrlRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const loadUrl = useCallback(async () => {
    setViewerError(false);
    const result = await onSignedUrl({ reportId: report.id });
    if (!result.ok) {
      setViewerError(true);
      return;
    }
    setUrl(result.url);
    const msUntilExpiry = result.expiresAt - Date.now();
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // Re-request before the signed URL actually expires, so a report left
    // open longer than five minutes never shows a broken frame.
    refreshTimer.current = setTimeout(() => void loadUrlRef.current(), Math.max(msUntilExpiry - 5000, 1000));
  }, [onSignedUrl, report.id]);

  useEffect(() => {
    loadUrlRef.current = loadUrl;
  }, [loadUrl]);

  useEffect(() => {
    // Same sanctioned case as useDraft's read: the signed URL is an external
    // system's answer (a server action call) that cannot be known until after
    // mount, so there is no synchronous alternative to fetching it here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUrl();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [loadUrl]);

  function fieldError(kind: ReportTitleValidationError): string {
    if (kind === "empty") return t("errors.titleEmpty");
    if (kind === "too_long") return t("errors.titleEmpty");
    return t("errors.save");
  }

  async function saveChanges() {
    const validated = validateReportTitle(title);
    const fieldErrors: { title?: string; reportDate?: string } = {};
    if (!validated.ok) fieldErrors.title = fieldError(validated.error);
    if (!reportDate) fieldErrors.reportDate = t("errors.dateRequired");
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveError(null);
    try {
      const result = await onUpdate({ reportId: report.id, title, reportDate });
      if (result.ok) {
        onUpdated(result.report);
      } else if ("errors" in result) {
        setErrors({
          ...(result.errors.title ? { title: fieldError(result.errors.title) } : {}),
          ...(result.errors.reportDate ? { reportDate: t("errors.dateRequired") } : {}),
        });
      } else {
        setSaveError(t("errors.save"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const result = await onDelete({ reportId: report.id });
      if (result.ok) {
        onDeleted(report.id);
        onClose();
      } else {
        setConfirmingDelete(false);
        setSaveError(t("errors.save"));
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex h-[200px] w-full items-center justify-center overflow-hidden rounded-md bg-surface">
        {viewerError && (
          <div className="flex flex-col items-center gap-sm p-md text-center">
            <p className="text-body-sm text-text-secondary">{t("viewerError")}</p>
            <Button type="button" variant="secondary" onClick={() => void loadUrl()}>
              {t("viewerRetry")}
            </Button>
          </div>
        )}
        {!viewerError && !url && <p className="text-body-sm text-text-secondary">{t("viewerLoading")}</p>}
        {!viewerError && url && mimeGroup(report.mimeType) === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- a signed, time-limited URL isn't a static asset Next's image optimizer can cache.
          <img src={url} alt={report.title} className="h-full w-full object-contain" />
        )}
        {!viewerError && url && mimeGroup(report.mimeType) === "pdf" && (
          <object data={url} type="application/pdf" className="h-full w-full">
            <a href={url} target="_blank" rel="noopener noreferrer">
              {t("openFile")}
            </a>
          </object>
        )}
      </div>

      <Input
        id="report-view-title"
        label={t("reportTypeLabel")}
        value={title}
        {...(errors.title ? { error: errors.title } : {})}
        onChange={(event) => {
          setTitle(event.target.value);
          setErrors({});
        }}
      />
      <div className="flex flex-col gap-xs">
        <label htmlFor="report-view-date" className="text-body-sm text-text-secondary">
          {t("dateLabel")}
        </label>
        <input
          id="report-view-date"
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

      {saveError && (
        <p role="alert" className="text-body-sm text-alert">
          {saveError}
        </p>
      )}

      <div className="flex gap-sm">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          {t("cancel")}
        </Button>
        <Button type="button" loading={saving} onClick={() => void saveChanges()} className="flex-1">
          {t("saveChanges")}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className="tap-target self-center text-caption text-text-secondary underline"
      >
        {t("deleteReport")}
      </button>

      <BottomSheet open={confirmingDelete} onClose={() => setConfirmingDelete(false)} title={t("deleteConfirmTitle")}>
        <p className="text-body text-text-secondary">{t("deleteConfirmBody")}</p>
        <div className="mt-md flex gap-sm">
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="tap-target flex-1 rounded-sm border border-divider px-lg py-sm text-button font-medium text-text-primary"
          >
            {t("deleteCancel")}
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={deleting}
            className="tap-target flex-1 rounded-sm bg-accent-primary px-lg py-sm text-button font-medium text-surface-raised disabled:opacity-60"
          >
            {t("deleteConfirm")}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
