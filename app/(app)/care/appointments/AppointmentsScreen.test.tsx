import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentsScreen } from "@/app/(app)/care/appointments/AppointmentsScreen";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

const NOW = new Date("2026-09-12T09:00:00+05:30").getTime();

beforeEach(() => {
  useOnline.mockReset().mockReturnValue(true);
  track.mockReset();
});

function renderScreen(overrides: Partial<React.ComponentProps<typeof AppointmentsScreen>> = {}) {
  const onAdd = vi.fn().mockResolvedValue({
    ok: true,
    appointment: {
      id: "a2",
      title: "Dr. Anjali Rao",
      doctor_name: "Dr. Anjali Rao",
      clinic_name: "City Care",
      scheduled_at: "2026-09-25T05:30:00.000Z",
      location: null,
      notes: null,
      status: "upcoming",
    },
  });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AppointmentsScreen
        appointments={[]}
        now={NOW}
        defaultDoctorName={null}
        defaultClinicName={null}
        onAdd={onAdd}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
  return { onAdd };
}

describe("AppointmentsScreen", () => {
  it("has a back link to Care", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: en.appointments.backLabel })).toHaveAttribute("href", "/care");
  });


  it("shows the empty state and an add action when there are no appointments", () => {
    renderScreen();
    expect(screen.getByText(en.appointments.emptyUpcoming)).toBeInTheDocument();
    expect(screen.getByText(en.appointments.addAppointment)).toBeInTheDocument();
  });

  it("opens the add sheet, saves, and shows the new appointment in the list", async () => {
    const { onAdd } = renderScreen();
    fireEvent.click(screen.getByText(en.appointments.addAppointment));
    expect(await screen.findByRole("heading", { name: en.appointments.addSheetTitle })).toBeInTheDocument();

    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, {
      target: { value: "2026-09-25T11:00" },
    });
    fireEvent.click(screen.getByText(en.appointments.saveButton));

    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(await screen.findByText("Dr. Anjali Rao, City Care")).toBeInTheDocument();
  });

  it("emits appointment_added with days_ahead only, never doctor or clinic", async () => {
    renderScreen();
    fireEvent.click(screen.getByText(en.appointments.addAppointment));
    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, {
      target: { value: "2026-09-25T11:00" },
    });
    fireEvent.click(screen.getByText(en.appointments.saveButton));

    await waitFor(() => expect(track).toHaveBeenCalledWith(EVENTS.appointment_added, { days_ahead: expect.any(Number) }));
    expect(track.mock.calls.flat(2)).not.toContain("Dr. Anjali Rao");
    expect(track.mock.calls.flat(2)).not.toContain("City Care");
  });
});
