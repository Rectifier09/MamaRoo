import { AppointmentsScreen } from "@/app/(app)/care/appointments/AppointmentsScreen";
import type { AppointmentRow } from "@/lib/domain/appointments";
import { getAppointmentsData } from "@/lib/supabase/queries/appointments";

/** Kept out of the component body: eslint's react-hooks/purity rule flags a
 * direct Date.now() call inside a component function, even an async server
 * one with no re-render concerns of its own (see Today's page.tsx). */
function nowMillis(): number {
  return Date.now();
}

export default async function CareAppointmentsPage() {
  const data = await getAppointmentsData();
  const now = nowMillis();

  return (
    <AppointmentsScreen
      // Postgres's status check constraint isn't reflected in the generated Row
      // type -- same loose cast the rest of the codebase uses at this boundary
      // (see BabyPage's timelineEvents cast).
      appointments={data.appointments as unknown as AppointmentRow[]}
      now={now}
      defaultDoctorName={data.profile?.doctor_name ?? null}
      defaultClinicName={data.profile?.clinic_name ?? null}
    />
  );
}
