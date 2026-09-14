import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { ReportsScreen } from "@/app/(app)/care/reports/ReportsScreen";
import en from "@/i18n/en.json";
import type { ReportRecord } from "@/lib/domain/reports";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

vi.mock("@/app/actions/reports", () => ({
  startReportUpload: vi.fn(),
  confirmReportUpload: vi.fn().mockResolvedValue({ ok: true }),
  cancelReportUpload: vi.fn(),
  signedReportUrl: vi.fn().mockResolvedValue({ ok: true, url: "https://example.com/signed", expiresAt: Date.now() + 300_000 }),
  updateReportMetadata: vi.fn(),
  deleteReport: vi.fn(),
}));

const storageUpload = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({ storage: { from: () => ({ upload: storageUpload }) } }),
}));

import { deleteReport, startReportUpload } from "@/app/actions/reports";

const existing: ReportRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Ultrasound scan",
  reportType: "Ultrasound scan",
  reportDate: "2026-09-10",
  mimeType: "image/jpeg",
  sizeBytes: 500_000,
  pageCount: null,
  createdAt: "2026-09-10T10:00:00Z",
};

function makeFile(): File {
  const file = new File([new Uint8Array(10)], "scan.jpg", { type: "image/jpeg" });
  Object.defineProperty(file, "size", { value: 500_001 });
  return file;
}

describe("ReportsScreen", () => {
  it("has a back link to Care", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ReportsScreen initialReports={[]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: en.reports.backLabel })).toHaveAttribute("href", "/care");
  });


  it("shows the empty state and an add action when there are no reports", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ReportsScreen initialReports={[]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(en.reports.empty)).toBeInTheDocument();
    expect(screen.getByText(en.reports.addReport)).toBeInTheDocument();
  });

  it("uploads a new report end to end and shows it in the list", async () => {
    const created: ReportRecord = {
      id: "20000000-0000-4000-8000-000000000002",
      title: "Blood test",
      reportType: "Blood test",
      reportDate: "2026-09-13",
      mimeType: "image/jpeg",
      sizeBytes: 500_001,
      pageCount: null,
      createdAt: "2026-09-13T10:00:00Z",
    };
    vi.mocked(startReportUpload).mockResolvedValue({ ok: true, report: created, path: "u1/r2/scan.jpg" });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ReportsScreen initialReports={[]} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByText(en.reports.addReport));
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    fireEvent.change(screen.getByLabelText(en.reports.reportTypeLabel), { target: { value: "Blood test" } });
    fireEvent.click(screen.getByText(en.reports.saveReport));

    await waitFor(() => expect(storageUpload).toHaveBeenCalledWith("u1/r2/scan.jpg", expect.any(File), expect.anything()));
    expect(await screen.findByText("Blood test")).toBeInTheDocument();
  });

  it("opens an existing report and deletes it, removing it from the list", async () => {
    vi.mocked(deleteReport).mockResolvedValue({ ok: true });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ReportsScreen initialReports={[existing]} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByText("Ultrasound scan"));
    await screen.findByRole("img");
    fireEvent.click(screen.getByText(en.reports.deleteReport));
    fireEvent.click(screen.getByText(en.reports.deleteConfirm));

    await waitFor(() => expect(deleteReport).toHaveBeenCalledWith({ reportId: existing.id }));
    await waitFor(() => expect(screen.queryByText("Ultrasound scan")).not.toBeInTheDocument());
    expect(screen.getByText(en.reports.empty)).toBeInTheDocument();
  });
});
