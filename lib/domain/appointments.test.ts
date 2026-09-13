import { describe, expect, it } from "vitest";
import { splitAppointments, validateAppointment } from "@/lib/domain/appointments";

const NOW = new Date("2026-09-12T09:00:00+05:30").getTime();

function appt(overrides: Partial<Parameters<typeof splitAppointments>[0]["appointments"][number]> = {}) {
  return {
    id: "a1",
    title: "Appointment",
    doctor_name: "Dr. Priya Sharma",
    clinic_name: "Sunrise Clinic",
    scheduled_at: "2026-09-20T11:00:00+05:30",
    location: null,
    notes: null,
    status: "upcoming" as const,
    ...overrides,
  };
}

describe("splitAppointments", () => {
  it("puts a future upcoming appointment in upcoming", () => {
    const { upcoming, past } = splitAppointments({ appointments: [appt()], now: NOW });
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });

  it("splits on now, not stored status alone: a past-time upcoming appointment moves to past, flagged needsClosing", () => {
    const { upcoming, past } = splitAppointments({
      appointments: [appt({ scheduled_at: "2026-09-01T11:00:00+05:30" })],
      now: NOW,
    });
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(1);
    expect(past[0]).toMatchObject({ needsClosing: true });
  });

  it("a completed appointment appears in past, not flagged needsClosing", () => {
    const { past } = splitAppointments({
      appointments: [appt({ scheduled_at: "2026-09-01T11:00:00+05:30", status: "completed" })],
      now: NOW,
    });
    expect(past[0]).toMatchObject({ needsClosing: false });
  });

  it("a cancelled appointment appears in neither list", () => {
    const { upcoming, past } = splitAppointments({
      appointments: [appt({ status: "cancelled" })],
      now: NOW,
    });
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(0);
  });

  it("sorts upcoming ascending", () => {
    const later = appt({ id: "later", scheduled_at: "2026-10-01T11:00:00+05:30" });
    const sooner = appt({ id: "sooner", scheduled_at: "2026-09-20T11:00:00+05:30" });
    const { upcoming } = splitAppointments({ appointments: [later, sooner], now: NOW });
    expect(upcoming.map((a) => a.id)).toEqual(["sooner", "later"]);
  });

  it("sorts past descending", () => {
    const older = appt({ id: "older", scheduled_at: "2026-08-01T11:00:00+05:30", status: "completed" });
    const newer = appt({ id: "newer", scheduled_at: "2026-09-01T11:00:00+05:30", status: "completed" });
    const { past } = splitAppointments({ appointments: [older, newer], now: NOW });
    expect(past.map((a) => a.id)).toEqual(["newer", "older"]);
  });

  it("keeps a stable order for two appointments at the identical moment", () => {
    const first = appt({ id: "first" });
    const second = appt({ id: "second" });
    const { upcoming } = splitAppointments({ appointments: [first, second], now: NOW });
    expect(upcoming.map((a) => a.id)).toEqual(["first", "second"]);
  });
});

const validInput = {
  doctorName: "Dr. Priya Sharma",
  clinicName: "Sunrise Clinic",
  scheduledAt: "2026-09-20T11:00",
};

describe("validateAppointment", () => {
  it("requires a date and time", () => {
    const result = validateAppointment({ ...validInput, scheduledAt: "" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.scheduledAt).toBeDefined();
  });

  it("rejects an invalid date string", () => {
    const result = validateAppointment({ ...validInput, scheduledAt: "not-a-date" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.scheduledAt).toBeDefined();
  });

  it("rejects a date more than two years out, with a bounded message", () => {
    const result = validateAppointment({ ...validInput, scheduledAt: "2029-09-20T11:00" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.scheduledAt).toBeDefined();
  });

  it("accepts an appointment in the past, since she may be recording one she already attended", () => {
    const result = validateAppointment({ ...validInput, scheduledAt: "2026-01-01T11:00" }, NOW);
    expect(result.ok).toBe(true);
  });

  it("trims text fields", () => {
    const result = validateAppointment({ ...validInput, doctorName: "  Dr. Priya Sharma  " }, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.doctorName).toBe("Dr. Priya Sharma");
  });

  it("accepts Devanagari in every text field", () => {
    const result = validateAppointment(
      { ...validInput, doctorName: "डॉ. प्रिया शर्मा", clinicName: "सनराइज़ क्लिनिक", location: "मुख्य गेट के पास" },
      NOW,
    );
    expect(result.ok).toBe(true);
  });

  it("derives a title from the doctor's name when none is given", () => {
    const result = validateAppointment(validInput, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.title).toBe("Dr. Priya Sharma");
  });

  it("falls back to a generic title when no doctor is given either", () => {
    const result = validateAppointment({ scheduledAt: "2026-09-20T11:00" }, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.title.length).toBeGreaterThan(0);
  });
});
