import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { ReportList } from "@/app/(app)/care/reports/ReportList";
import en from "@/i18n/en.json";
import type { ReportRecord } from "@/lib/domain/reports";

function makeReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: "1",
    title: "Ultrasound scan",
    reportType: "Ultrasound scan",
    reportDate: "2026-09-10",
    mimeType: "image/jpeg",
    sizeBytes: 500_000,
    pageCount: null,
    createdAt: "2026-09-10T10:00:00Z",
    ...overrides,
  };
}

function renderList(reports: ReportRecord[], onOpen = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ReportList reports={reports} onOpen={onOpen} />
    </NextIntlClientProvider>,
  );
  return { onOpen };
}

describe("ReportList", () => {
  it("shows an inviting empty state when there are no reports", () => {
    renderList([]);
    expect(screen.getByText(en.reports.empty)).toBeInTheDocument();
  });

  it("shows each report's title and date", () => {
    renderList([makeReport()]);
    expect(screen.getByText("Ultrasound scan")).toBeInTheDocument();
    expect(screen.getByText("10 September")).toBeInTheDocument();
  });

  it("opens the tapped report", () => {
    const report = makeReport();
    const { onOpen } = renderList([report]);
    fireEvent.click(screen.getByText("Ultrasound scan"));
    expect(onOpen).toHaveBeenCalledWith(report);
  });

  it("shows only the first 15 reports with a show-more link for the rest", () => {
    const reports = Array.from({ length: 18 }, (_, i) =>
      makeReport({ id: String(i), title: `Report ${i}`, reportDate: `2026-09-${String(10 + i).padStart(2, "0")}` }),
    );
    renderList(reports);
    expect(screen.getByText("Report 0")).toBeInTheDocument();
    expect(screen.queryByText("Report 17")).not.toBeInTheDocument();
    expect(screen.getByText("Show 3 more")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show 3 more"));
    expect(screen.getByText("Report 17")).toBeInTheDocument();
  });
});
