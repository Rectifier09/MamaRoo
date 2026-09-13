import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MedicinesScreen } from "@/app/(app)/care/medicines/MedicinesScreen";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

beforeEach(() => {
  useOnline.mockReset().mockReturnValue(true);
  track.mockReset();
});

function renderScreen(overrides: Partial<React.ComponentProps<typeof MedicinesScreen>> = {}) {
  const onSave = vi.fn().mockResolvedValue({
    ok: true,
    medicine: {
      id: "m2",
      name: "Calcium",
      dosage: null,
      form: null,
      schedule_times: ["21:00"],
      days_of_week: null,
      start_date: "2026-09-12",
      end_date: null,
      notes: null,
      is_active: true,
    },
  });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <MedicinesScreen
          today="2026-09-12"
          items={[]}
          cells={[]}
          existingActiveNames={[]}
          onSave={onSave}
          {...overrides}
        />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return { onSave };
}

describe("MedicinesScreen", () => {
  it("shows the empty state and an add-medicine action when there are no medicines", () => {
    renderScreen();
    expect(screen.getByText(en.care.medicines.emptyState)).toBeInTheDocument();
    expect(screen.getByText(en.care.medicines.addMedicine)).toBeInTheDocument();
    expect(screen.getByText(en.care.medicines.adherence.title)).toBeInTheDocument();
  });

  it("opens the add sheet and saves a new medicine into the list", async () => {
    const { onSave } = renderScreen();
    fireEvent.click(screen.getByText(en.care.medicines.addMedicine));
    expect(await screen.findByRole("heading", { name: en.care.medicines.addSheetTitle })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(en.care.medicines.nameLabel), { target: { value: "Calcium" } });
    fireEvent.change(document.querySelector('input[type="time"]')!, { target: { value: "21:00" } });
    fireEvent.click(screen.getByText(en.care.medicines.saveButton));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(await screen.findByText("Calcium")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: en.care.medicines.addSheetTitle })).not.toBeInTheDocument();
  });

  it("emits medicine_added with the schedule count, never the medicine name", async () => {
    renderScreen();
    fireEvent.click(screen.getByText(en.care.medicines.addMedicine));
    fireEvent.change(await screen.findByLabelText(en.care.medicines.nameLabel), { target: { value: "Calcium" } });
    fireEvent.change(document.querySelector('input[type="time"]')!, { target: { value: "21:00" } });
    fireEvent.click(screen.getByText(en.care.medicines.saveButton));

    await waitFor(() => expect(track).toHaveBeenCalledWith(EVENTS.medicine_added, { schedule_count: 1 }));
    expect(track.mock.calls.flat(2)).not.toContain("Calcium");
  });
});
