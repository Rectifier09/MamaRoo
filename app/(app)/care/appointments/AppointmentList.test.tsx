import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { AppointmentList } from "@/app/(app)/care/appointments/AppointmentList";
import type { AppointmentRow } from "@/lib/domain/appointments";
import en from "@/i18n/en.json";

const NOW = new Date("2026-09-12T09:00:00+05:30").getTime();

function row(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
  return {
    id: "a1",
    title: "Dr. Priya Sharma",
    doctor_name: "Dr. Priya Sharma",
    clinic_name: "Sunrise Clinic",
    scheduled_at: "2026-09-20T05:30:00.000Z",
    location: null,
    notes: null,
    status: "upcoming",
    ...overrides,
  };
}

function renderList(appointments: AppointmentRow[], overrides: Partial<React.ComponentProps<typeof AppointmentList>> = {}) {
  const onComplete = vi.fn().mockResolvedValue({ ok: true });
  const onEdit = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AppointmentList appointments={appointments} now={NOW} onComplete={onComplete} onEdit={onEdit} {...overrides} />
    </NextIntlClientProvider>,
  );
  return { onComplete, onEdit };
}

describe("AppointmentList", () => {
  it("renders the upcoming section before the past section", () => {
    renderList([
      row({ id: "past-1", scheduled_at: "2026-08-01T05:30:00.000Z", status: "completed" }),
      row({ id: "upcoming-1", scheduled_at: "2026-10-01T05:30:00.000Z" }),
    ]);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings.indexOf(en.appointments.upcomingHeading)).toBeLessThan(headings.indexOf(en.appointments.pastHeading));
  });

  it("shows section-specific empty copy for each empty section", () => {
    renderList([]);
    expect(screen.getByText(en.appointments.emptyUpcoming)).toBeInTheDocument();
    expect(screen.getByText(en.appointments.emptyPast)).toBeInTheDocument();
  });

  it("offers a 'how did your visit go' prompt for a needsClosing appointment, with complete and reschedule actions", () => {
    renderList([row({ scheduled_at: "2026-09-01T05:30:00.000Z" })]);
    expect(screen.getByText(en.appointments.needsClosingPrompt)).toBeInTheDocument();
    expect(screen.getByText(en.appointments.markCompleted)).toBeInTheDocument();
    expect(screen.getByText(en.appointments.reschedule)).toBeInTheDocument();
  });

  it("marking a needs-closing appointment completed calls onComplete", async () => {
    const { onComplete } = renderList([row({ id: "a1", scheduled_at: "2026-09-01T05:30:00.000Z" })]);
    fireEvent.click(screen.getByText(en.appointments.markCompleted));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith("a1"));
  });

  it("reschedule on a needs-closing appointment opens the edit sheet", () => {
    const { onEdit } = renderList([row({ id: "a1", scheduled_at: "2026-09-01T05:30:00.000Z" })]);
    fireEvent.click(screen.getByText(en.appointments.reschedule));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("tapping a normal upcoming card opens the edit sheet", () => {
    const { onEdit } = renderList([row({ id: "a1", scheduled_at: "2026-10-01T05:30:00.000Z" })]);
    fireEvent.click(screen.getByText("Dr. Priya Sharma, Sunrise Clinic"));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("tapping a past card also opens the edit sheet", () => {
    const { onEdit } = renderList([row({ id: "a1", scheduled_at: "2026-08-01T05:30:00.000Z", status: "completed" })]);
    fireEvent.click(screen.getByText("Dr. Priya Sharma, Sunrise Clinic"));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("shows a muted status badge on a past card", () => {
    renderList([row({ scheduled_at: "2026-08-01T05:30:00.000Z", status: "completed" })]);
    expect(screen.getByText(en.appointments.completedBadge)).toBeInTheDocument();
  });

  it("shows more than 15 past appointments only after Show more is tapped", () => {
    const many = Array.from({ length: 17 }, (_, i) =>
      row({ id: `past-${i}`, scheduled_at: `2026-0${(i % 8) + 1}-01T05:30:00.000Z`, status: "completed" }),
    );
    renderList(many);
    expect(screen.getAllByText("Dr. Priya Sharma, Sunrise Clinic")).toHaveLength(15);
    fireEvent.click(screen.getByText(en.appointments.showMore.replace("{count}", "2")));
    expect(screen.getAllByText("Dr. Priya Sharma, Sunrise Clinic")).toHaveLength(17);
  });
});
