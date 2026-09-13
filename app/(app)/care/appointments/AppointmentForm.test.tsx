import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentForm } from "@/app/(app)/care/appointments/AppointmentForm";
import en from "@/i18n/en.json";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

function renderForm(overrides: Partial<React.ComponentProps<typeof AppointmentForm>> = {}) {
  const onAdd = vi.fn().mockResolvedValue({ ok: true, appointment: { id: "a1" } });
  const onUpdate = vi.fn().mockResolvedValue({ ok: true });
  const onCancelAppointment = vi.fn().mockResolvedValue({ ok: true });
  const onSaved = vi.fn();
  const onCancelled = vi.fn();
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AppointmentForm
        onAdd={onAdd}
        onUpdate={onUpdate}
        onCancelAppointment={onCancelAppointment}
        onSaved={onSaved}
        onCancelled={onCancelled}
        onClose={onClose}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
  return { onAdd, onUpdate, onCancelAppointment, onSaved, onCancelled, onClose };
}

describe("AppointmentForm", () => {
  it("renders a native datetime-local input", () => {
    renderForm();
    expect(document.querySelector('input[type="datetime-local"]')).not.toBeNull();
  });

  it("defaults doctor and clinic from her profile, editable", () => {
    renderForm({ defaultDoctorName: "Dr. Priya Sharma", defaultClinicName: "Sunrise Clinic" });
    const doctorInput = screen.getByLabelText(en.appointments.doctorLabel) as HTMLInputElement;
    expect(doctorInput.value).toBe("Dr. Priya Sharma");
    fireEvent.change(doctorInput, { target: { value: "Dr. Anjali Rao" } });
    expect(doctorInput.value).toBe("Dr. Anjali Rao");
  });

  it("shows a specific error when no date is chosen", () => {
    renderForm();
    fireEvent.click(screen.getByText(en.appointments.saveButton));
    expect(screen.getByText(en.appointments.errors.dateRequired)).toBeInTheDocument();
  });

  it("adds a new appointment and reports it", async () => {
    const { onAdd, onSaved } = renderForm();
    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, {
      target: { value: "2026-09-20T11:00" },
    });
    fireEvent.click(screen.getByText(en.appointments.saveButton));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: "a1" }));
  });

  it("updates an existing appointment in edit mode", async () => {
    const { onUpdate, onSaved } = renderForm({
      appointment: {
        id: "a1",
        title: "Dr. Priya Sharma",
        doctor_name: "Dr. Priya Sharma",
        clinic_name: "Sunrise Clinic",
        scheduled_at: "2026-09-20T05:30:00.000Z",
        location: null,
        notes: null,
        status: "upcoming",
        needsClosing: false,
      },
    });
    fireEvent.click(screen.getByText(en.appointments.saveButton));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("a1", expect.any(Object)));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("offers cancel-appointment only in edit mode", async () => {
    const { onCancelAppointment, onCancelled } = renderForm({
      appointment: {
        id: "a1",
        title: "Dr. Priya Sharma",
        doctor_name: "Dr. Priya Sharma",
        clinic_name: "Sunrise Clinic",
        scheduled_at: "2026-09-20T05:30:00.000Z",
        location: null,
        notes: null,
        status: "upcoming",
        needsClosing: false,
      },
    });
    fireEvent.click(screen.getByText(en.appointments.cancelThisAppointment));
    fireEvent.click(await screen.findByText(en.appointments.cancelConfirm));
    await waitFor(() => expect(onCancelAppointment).toHaveBeenCalledWith("a1"));
    await waitFor(() => expect(onCancelled).toHaveBeenCalled());
  });

  it("has no cancel-appointment action in add mode", () => {
    renderForm();
    expect(screen.queryByText(en.appointments.cancelThisAppointment)).not.toBeInTheDocument();
  });

  it("blocks submission while offline, with an explanation", () => {
    useOnline.mockReturnValue(false);
    const { onAdd } = renderForm();
    expect(screen.getAllByText(en.appointments.offline).at(-1)).toBeInTheDocument();
    fireEvent.click(screen.getByText(en.appointments.saveButton));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
