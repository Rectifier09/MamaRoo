import en from "@/i18n/en.json";

const t = (key: keyof typeof en.appointments.errors) => en.appointments.errors[key];

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export interface AppointmentRow {
  id: string;
  title: string;
  doctor_name: string | null;
  clinic_name: string | null;
  scheduled_at: string;
  location: string | null;
  notes: string | null;
  status: "upcoming" | "completed" | "cancelled";
}

export interface SplitAppointment extends AppointmentRow {
  /** True for an appointment whose time has passed while it's still marked
   * "upcoming" -- she hasn't said whether it happened. Counted in `past` (its
   * date has already passed) but rendered as a distinct, non-alarming prompt
   * rather than folded into the plain past list. */
  needsClosing: boolean;
}

export function splitAppointments({
  appointments,
  now,
}: {
  appointments: AppointmentRow[];
  now: number;
}): { upcoming: SplitAppointment[]; past: SplitAppointment[] } {
  const upcoming: SplitAppointment[] = [];
  const past: SplitAppointment[] = [];

  for (const appointment of appointments) {
    if (appointment.status === "cancelled") continue;

    const isPastTime = new Date(appointment.scheduled_at).getTime() < now;
    if (appointment.status === "upcoming" && !isPastTime) {
      upcoming.push({ ...appointment, needsClosing: false });
    } else if (appointment.status === "upcoming" && isPastTime) {
      past.push({ ...appointment, needsClosing: true });
    } else {
      past.push({ ...appointment, needsClosing: false });
    }
  }

  upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  past.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  return { upcoming, past };
}

export interface AppointmentInput {
  title?: string;
  doctorName?: string;
  clinicName?: string;
  scheduledAt: string;
  location?: string;
  notes?: string;
}

export interface AppointmentValue {
  title: string;
  doctorName: string | null;
  clinicName: string | null;
  scheduledAt: string;
  location: string | null;
  notes: string | null;
}

export type AppointmentResult =
  | { ok: true; value: AppointmentValue }
  | { ok: false; errors: Record<string, string> };

/**
 * The designer markup (Appointments.dc.html) has no separate "title" field --
 * doctor and clinic are the only identifying fields she fills in, and every
 * card shows "{doctor}, {clinic}" directly. `title` still exists as a required
 * database column (used by Today's reminder line and the Visit Summary), so it
 * is derived here rather than collected: her chosen title, then the doctor's
 * name, then a generic fallback.
 */
export function validateAppointment(input: AppointmentInput, now: number = Date.now()): AppointmentResult {
  const errors: Record<string, string> = {};

  const scheduledAtRaw = input.scheduledAt?.trim() ?? "";
  const parsed = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

  if (!scheduledAtRaw) {
    errors.scheduledAt = t("dateRequired");
  } else if (!parsed || Number.isNaN(parsed.getTime())) {
    errors.scheduledAt = t("dateInvalid");
  } else if (parsed.getTime() - now > TWO_YEARS_MS) {
    errors.scheduledAt = t("tooFarOut");
  }

  const doctorName = input.doctorName?.trim() || null;
  const clinicName = input.clinicName?.trim() || null;
  const location = input.location?.trim() || null;
  const notes = input.notes?.trim() || null;
  const title = input.title?.trim() || doctorName || "Appointment";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      doctorName,
      clinicName,
      scheduledAt: parsed!.toISOString(),
      location,
      notes,
    },
  };
}
