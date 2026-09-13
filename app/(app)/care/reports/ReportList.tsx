"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { APP_TIMEZONE } from "@/lib/config";
import { mimeGroup, type ReportRecord } from "@/lib/domain/reports";

const PAGE_SIZE = 15;

export interface ReportListProps {
  reports: ReportRecord[];
  onOpen: (report: ReportRecord) => void;
}

export function ReportList({ reports, onOpen }: ReportListProps) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? reports : reports.slice(0, PAGE_SIZE);
  const remaining = reports.length - visible.length;

  function dateLabel(iso: string): string {
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      timeZone: APP_TIMEZONE,
    }).format(new Date(iso));
  }

  if (reports.length === 0) {
    return <EmptyState iconName="FileText" message={t("empty")} />;
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-2 gap-md">
        {visible.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => onOpen(report)}
            className="tap-target flex flex-col gap-xs rounded-[16px] bg-surface-raised p-sm text-left shadow-1"
          >
            <span
              aria-hidden="true"
              className="flex h-[110px] w-full items-center justify-center rounded-[14px] bg-surface"
            >
              <Icon name={mimeGroup(report.mimeType) === "pdf" ? "FilePdf" : "Image"} size="hero" />
            </span>
            <span className="mt-xs block text-body-sm font-semibold text-text-primary">{report.title}</span>
            <span className="block text-caption text-text-secondary">{dateLabel(report.reportDate)}</span>
          </button>
        ))}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tap-target self-start text-caption font-semibold text-accent-primary underline"
        >
          {t("showMore", { count: remaining })}
        </button>
      )}
    </div>
  );
}
