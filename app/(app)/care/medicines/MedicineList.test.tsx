import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MedicineList, type MedicineListItem } from "@/app/(app)/care/medicines/MedicineList";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({
  track: (...args: unknown[]) => track(...args),
}));

function item(overrides: Partial<MedicineListItem> = {}): MedicineListItem {
  return {
    id: "m1",
    name: "Vitamin D3",
    dosage: "1 capsule",
    isPriority: false,
    status: "pending",
    nextPendingTime: "09:00",
    todayTimes: ["09:00"],
    ...overrides,
  };
}

beforeEach(() => track.mockReset());

function renderList(items: MedicineListItem[], overrides: Partial<React.ComponentProps<typeof MedicineList>> = {}) {
  const onLogDose = vi.fn().mockResolvedValue({ ok: true });
  const onDeactivate = vi.fn().mockResolvedValue({ ok: true });
  const onReschedule = vi.fn().mockResolvedValue({ ok: true });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <MedicineList
          items={items}
          today="2026-09-12"
          onLogDose={onLogDose}
          onDeactivate={onDeactivate}
          onReschedule={onReschedule}
          {...overrides}
        />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return { onLogDose, onDeactivate, onReschedule };
}

describe("MedicineList", () => {
  it("shows the medicine-specific empty state when there are no medicines at all", () => {
    renderList([]);
    expect(screen.getByText(en.care.medicines.emptyState)).toBeInTheDocument();
  });

  it("renders a log control for a pending dose", () => {
    renderList([item()]);
    expect(screen.getByText(en.care.medicines.takenLabel)).toBeInTheDocument();
    expect(screen.getByText(en.care.medicines.skipLabel)).toBeInTheDocument();
  });

  it("a past unlogged dose is still loggable", () => {
    renderList([item({ nextPendingTime: "06:00", todayTimes: ["06:00"] })]);
    expect(screen.getByText(en.care.medicines.takenLabel)).toBeInTheDocument();
  });

  it("logging a dose shows a toast and updates optimistically", async () => {
    const { onLogDose } = renderList([item()]);
    fireEvent.click(screen.getByText(en.care.medicines.takenLabel));

    expect(await screen.findByText(en.care.medicines.takenBadge)).toBeInTheDocument();
    await waitFor(() =>
      expect(onLogDose).toHaveBeenCalledWith({
        medicineId: "m1",
        scheduledDate: "2026-09-12",
        scheduledTime: "09:00",
        status: "taken",
      }),
    );
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("emits medicine_dose_logged with the status and lateness, never the medicine name", async () => {
    renderList([item()]);
    fireEvent.click(screen.getByText(en.care.medicines.takenLabel));
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith(EVENTS.medicine_dose_logged, { status: "taken", late: expect.any(Boolean) }),
    );
    expect(track.mock.calls.flat(2)).not.toContain("Vitamin D3");
  });

  it("shows a taken badge and a reschedule action once logged", () => {
    renderList([item({ status: "taken", nextPendingTime: null })]);
    expect(screen.getByText(en.care.medicines.takenBadge)).toBeInTheDocument();
    expect(screen.getByText(en.care.medicines.rescheduleLabel)).toBeInTheDocument();
  });

  it("shows a skipped badge, softened, once skipped", () => {
    renderList([item({ status: "skipped", nextPendingTime: null })]);
    expect(screen.getByText(en.care.medicines.skippedBadge)).toBeInTheDocument();
  });

  it("renders priority medicines in a separate always-visible tracker", () => {
    renderList([item({ id: "m2", name: "Iron and folic acid", isPriority: true })]);
    expect(screen.getByText(en.care.medicines.trackerTitle)).toBeInTheDocument();
    expect(screen.queryByText(en.care.medicines.otherMedicines)).not.toBeInTheDocument();
  });

  it("deactivating asks for confirmation in a sheet rather than a native confirm dialog", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const { onDeactivate } = renderList([item()]);

    fireEvent.click(screen.getByText(en.care.medicines.stopMedicine));
    expect(await screen.findByText(en.care.medicines.deactivateConfirmTitle)).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(en.care.medicines.deactivateConfirm));
    await waitFor(() => expect(onDeactivate).toHaveBeenCalledWith("m1"));
    confirmSpy.mockRestore();
  });

  it("reschedule opens a time-chip sheet and applies the chosen time", async () => {
    const { onReschedule } = renderList([item({ status: "taken", nextPendingTime: null })]);

    fireEvent.click(screen.getByText(en.care.medicines.rescheduleLabel));
    expect(await screen.findByText(en.care.medicines.rescheduleEvening)).toBeInTheDocument();

    fireEvent.click(screen.getByText(en.care.medicines.rescheduleEvening));
    await waitFor(() => expect(onReschedule).toHaveBeenCalledWith("m1", { scheduleTimes: ["18:00"] }));
  });

  it("cancelling the deactivate sheet keeps the medicine", async () => {
    const { onDeactivate } = renderList([item()]);
    fireEvent.click(screen.getByText(en.care.medicines.stopMedicine));
    fireEvent.click(await screen.findByText(en.care.medicines.deactivateCancel));
    expect(screen.queryByText(en.care.medicines.deactivateConfirmTitle)).not.toBeInTheDocument();
    expect(onDeactivate).not.toHaveBeenCalled();
  });
});
