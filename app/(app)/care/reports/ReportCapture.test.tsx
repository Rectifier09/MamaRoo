import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCapture, type ReportCaptureProps } from "@/app/(app)/care/reports/ReportCapture";
import en from "@/i18n/en.json";
import { EVENTS } from "@/lib/analytics/events";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => "blob:mock");
if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();

function makeFile({
  name = "photo.jpg",
  type = "image/jpeg",
  size = 500_000,
}: { name?: string; type?: string; size?: number } = {}): File {
  const file = new File([new Uint8Array(Math.min(size, 1024))], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

const startedReport = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Ultrasound scan",
  reportType: "Ultrasound scan",
  reportDate: "2026-09-13",
  mimeType: "image/jpeg",
  sizeBytes: 500_000,
  pageCount: null,
  createdAt: "2026-09-13T10:00:00Z",
};

function renderCapture(overrides: Partial<ReportCaptureProps> = {}) {
  const props: ReportCaptureProps = {
    existingReports: [],
    onStart: vi.fn().mockResolvedValue({ ok: true, report: startedReport, path: "u1/r1/photo.jpg" }),
    onConfirm: vi.fn().mockResolvedValue({ ok: true }),
    onCancelUpload: vi.fn().mockResolvedValue({ ok: true }),
    onUploaded: vi.fn(),
    onClose: vi.fn(),
    uploadFile: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ReportCapture {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => {
  useOnline.mockReset().mockReturnValue(true);
  track.mockReset();
});

describe("ReportCapture -- file validation", () => {
  it("rejects an unsupported type with the reason named, without advancing", async () => {
    renderCapture();
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile({ type: "text/plain" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent(en.reports.errors.fileType);
    expect(screen.queryByLabelText(en.reports.reportTypeLabel)).not.toBeInTheDocument();
  });

  it("rejects an oversized file before any upload starts, with the limit stated", async () => {
    const onStart = vi.fn();
    renderCapture({ onStart });
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile({ size: 21 * 1024 * 1024 })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("20");
    expect(onStart).not.toHaveBeenCalled();
  });
});

describe("ReportCapture -- unclear photo prompt", () => {
  it("flags a small image as unclear, retake returns to photo picking", () => {
    renderCapture();
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile({ size: 10_000 })] } });
    expect(screen.getByText(en.reports.qualityTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByText(en.reports.retake));
    expect(screen.getByText(en.reports.camera)).toBeInTheDocument();
    expect(screen.queryByText(en.reports.qualityTitle)).not.toBeInTheDocument();
  });

  it("use anyway proceeds past the quality prompt to the fields step", () => {
    renderCapture();
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile({ size: 10_000 })] } });
    fireEvent.click(screen.getByText(en.reports.useAnyway));
    expect(screen.getByLabelText(en.reports.reportTypeLabel)).toBeInTheDocument();
  });
});

describe("ReportCapture -- duplicate prompt", () => {
  it("flags a file matching an existing report's size and type", () => {
    renderCapture({ existingReports: [{ sizeBytes: 500_000, mimeType: "image/jpeg" }] });
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    expect(screen.getByText(en.reports.duplicateTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByText(en.reports.chooseDifferent));
    expect(screen.getByText(en.reports.camera)).toBeInTheDocument();
  });

  it("save anyway proceeds past the duplicate prompt to the fields step", () => {
    renderCapture({ existingReports: [{ sizeBytes: 500_000, mimeType: "image/jpeg" }] });
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    fireEvent.click(screen.getByText(en.reports.saveAnyway));
    expect(screen.getByLabelText(en.reports.reportTypeLabel)).toBeInTheDocument();
  });
});

describe("ReportCapture -- save flow", () => {
  it("defaults the date to today and requires a report type before saving", async () => {
    const onStart = vi.fn();
    renderCapture({ onStart, existingReports: [] });
    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    expect((screen.getByLabelText(en.reports.dateLabel) as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.click(screen.getByText(en.reports.saveReport));
    expect(await screen.findByText(en.reports.errors.titleEmpty)).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("starts the upload, uploads the file, confirms, and reports success with a size and mime bucket only", async () => {
    const onStart = vi.fn().mockResolvedValue({ ok: true, report: startedReport, path: "u1/r1/photo.jpg" });
    const onConfirm = vi.fn().mockResolvedValue({ ok: true });
    const uploadFile = vi.fn().mockResolvedValue({ ok: true });
    const onUploaded = vi.fn();
    renderCapture({ onStart, onConfirm, uploadFile, onUploaded });

    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await userEvent.type(screen.getByLabelText(en.reports.reportTypeLabel), "Ultrasound scan");
    fireEvent.click(screen.getByText(en.reports.saveReport));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(startedReport));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ title: "Ultrasound scan", fileName: "photo.jpg" }));
    expect(uploadFile).toHaveBeenCalledWith("u1/r1/photo.jpg", expect.any(File));
    expect(onConfirm).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(EVENTS.report_uploaded, { mime_group: "image", size_bucket: "small" });
    expect(JSON.stringify(track.mock.calls)).not.toContain("photo.jpg");
    expect(JSON.stringify(track.mock.calls)).not.toContain("Ultrasound scan");
  });

  it("cancels the metadata row and offers retry when the upload itself fails", async () => {
    const onCancelUpload = vi.fn().mockResolvedValue({ ok: true });
    const uploadFile = vi.fn().mockResolvedValue({ ok: false, error: "network" });
    const onUploaded = vi.fn();
    renderCapture({ onCancelUpload, uploadFile, onUploaded });

    const input = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await userEvent.type(screen.getByLabelText(en.reports.reportTypeLabel), "Ultrasound scan");
    fireEvent.click(screen.getByText(en.reports.saveReport));

    expect(await screen.findByRole("alert")).toHaveTextContent(en.reports.errors.uploadFailed);
    expect(onCancelUpload).toHaveBeenCalledWith({ reportId: startedReport.id });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(screen.getByLabelText(en.reports.reportTypeLabel)).toHaveValue("Ultrasound scan");
    expect(screen.getByText(en.reports.retryUpload)).toBeInTheDocument();
  });
});

describe("ReportCapture -- offline", () => {
  it("blocks opening the camera or gallery and tracks the refusal", () => {
    useOnline.mockReturnValue(false);
    const onStart = vi.fn();
    renderCapture({ onStart });

    fireEvent.click(screen.getByText(en.reports.camera));
    expect(track).toHaveBeenCalledWith(EVENTS.offline_write_blocked, { feature: "report" });
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText(en.reports.offline)).toBeInTheDocument();
  });
});
