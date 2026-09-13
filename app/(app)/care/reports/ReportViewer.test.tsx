import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { ReportViewer, type ReportViewerProps } from "@/app/(app)/care/reports/ReportViewer";
import en from "@/i18n/en.json";
import type { ReportRecord } from "@/lib/domain/reports";

const report: ReportRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Ultrasound scan",
  reportType: "Ultrasound scan",
  reportDate: "2026-09-10",
  mimeType: "image/jpeg",
  sizeBytes: 500_000,
  pageCount: null,
  createdAt: "2026-09-10T10:00:00Z",
};

function renderViewer(overrides: Partial<ReportViewerProps> = {}) {
  const props: ReportViewerProps = {
    report,
    onSignedUrl: vi.fn().mockResolvedValue({ ok: true, url: "https://example.com/signed", expiresAt: Date.now() + 300_000 }),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onUpdated: vi.fn(),
    onDeleted: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ReportViewer {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

describe("ReportViewer", () => {
  it("shows a loading state, then the signed image", async () => {
    renderViewer();
    expect(screen.getByText(en.reports.viewerLoading)).toBeInTheDocument();
    const img = await screen.findByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/signed");
  });

  it("shows a pdf via an object tag with a non-download fallback link", async () => {
    renderViewer({ report: { ...report, mimeType: "application/pdf" } });
    const link = await screen.findByRole("link", { name: en.reports.openFile });
    expect(link).toHaveAttribute("href", "https://example.com/signed");
    expect(link).not.toHaveAttribute("download");
  });

  it("shows an error and a retry action when the signed url can't be fetched", async () => {
    const onSignedUrl = vi.fn().mockResolvedValue({ ok: false, error: "report_not_found" });
    renderViewer({ onSignedUrl });
    expect(await screen.findByText(en.reports.viewerError)).toBeInTheDocument();

    onSignedUrl.mockResolvedValueOnce({ ok: true, url: "https://example.com/retried", expiresAt: Date.now() + 300_000 });
    await userEvent.click(screen.getByText(en.reports.viewerRetry));
    expect(await screen.findByRole("img")).toHaveAttribute("src", "https://example.com/retried");
  });

  it("saves an edited title and date", async () => {
    const updated = { ...report, title: "Blood test", reportDate: "2026-09-11" };
    const onUpdate = vi.fn().mockResolvedValue({ ok: true, report: updated });
    const onUpdated = vi.fn();
    renderViewer({ onUpdate, onUpdated });
    await screen.findByRole("img");

    await userEvent.clear(screen.getByLabelText(en.reports.reportTypeLabel));
    await userEvent.type(screen.getByLabelText(en.reports.reportTypeLabel), "Blood test");
    await userEvent.click(screen.getByText(en.reports.saveChanges));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({ reportId: report.id, title: "Blood test", reportDate: "2026-09-10" }),
    );
    expect(onUpdated).toHaveBeenCalledWith(updated);
  });

  it("deletes the report after confirming", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true });
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    renderViewer({ onDelete, onDeleted, onClose });
    await screen.findByRole("img");

    await userEvent.click(screen.getByText(en.reports.deleteReport));
    await userEvent.click(screen.getByText(en.reports.deleteConfirm));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith({ reportId: report.id }));
    expect(onDeleted).toHaveBeenCalledWith(report.id);
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the report when delete is cancelled", async () => {
    const onDelete = vi.fn();
    renderViewer({ onDelete });
    await screen.findByRole("img");

    await userEvent.click(screen.getByText(en.reports.deleteReport));
    await userEvent.click(screen.getByText(en.reports.deleteCancel));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
