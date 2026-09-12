import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { MedicineQuickActionSheet } from "@/app/(app)/today/MedicineQuickActionSheet";

const logDose = vi.fn();
const track = vi.fn();

vi.mock("@/app/actions/medicines", () => ({
  logDose: (...args: unknown[]) => logDose(...args),
}));
vi.mock("@/components/AnalyticsProvider", () => ({
  track: (...args: unknown[]) => track(...args),
}));

const baseProps = {
  open: true,
  medicineId: "medicine-1",
  medicineName: "Iron tablet",
  scheduledDate: "2026-09-12",
  scheduledTime: "8:00 PM",
  onClose: vi.fn(),
};

function renderSheet(overrides: Partial<typeof baseProps> = {}) {
  const props = { ...baseProps, onClose: vi.fn(), ...overrides };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MedicineQuickActionSheet {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => {
  logDose.mockReset().mockResolvedValue({ ok: true });
  track.mockReset();
});

describe("MedicineQuickActionSheet", () => {
  it("opens in a BottomSheet with the medicine and time in its heading", () => {
    renderSheet();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iron tablet, 8:00 PM" })).toBeInTheDocument();
    expect(screen.getByText("Just a gentle nudge")).toBeInTheDocument();
  });

  it("logs Taken and shows its confirmation with Change", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: "Taken" }));

    await waitFor(() =>
      expect(logDose).toHaveBeenCalledWith({
        medicineId: "medicine-1",
        scheduledDate: "2026-09-12",
        scheduledTime: "8:00 PM",
        status: "taken",
      }),
    );
    expect(
      await screen.findByText("Taken, that is one more day you have shown up for yourself."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("logs Skip today and shows its own confirmation", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: "Skip today" }));

    await waitFor(() => expect(logDose).toHaveBeenCalledWith(expect.objectContaining({ status: "skipped" })));
    expect(
      await screen.findByText("No worries, some days are like that. We will check in again tomorrow."),
    ).toBeInTheDocument();
  });

  it("moves 11 PM to midnight locally without logging a dose", async () => {
    const onSnooze = vi.fn();
    renderSheet({ scheduledTime: "11:00 PM", onSnooze } as Partial<typeof baseProps>);
    await userEvent.click(screen.getByRole("button", { name: "Move to later time" }));

    expect(screen.getByRole("heading", { name: "Iron tablet, 12:00 AM" })).toBeInTheDocument();
    expect(screen.getByText("No rush at all, we will nudge you again at 12:00 AM.")).toBeInTheDocument();
    expect(logDose).not.toHaveBeenCalled();
    expect(onSnooze).toHaveBeenCalledWith("12:00 AM");
  });

  it("returns to all three actions on Change without logging again", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: "Taken" }));
    await screen.findByText("Taken, that is one more day you have shown up for yourself.");
    await userEvent.click(screen.getByRole("button", { name: "Change" }));

    expect(screen.getByRole("button", { name: "Taken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move to later time" })).toBeInTheDocument();
    expect(logDose).toHaveBeenCalledTimes(1);
  });

  it("links to the medicines screen", () => {
    renderSheet();
    expect(screen.getByRole("link", { name: "See all medicines" })).toHaveAttribute(
      "href",
      "/care/medicines",
    );
  });
});
