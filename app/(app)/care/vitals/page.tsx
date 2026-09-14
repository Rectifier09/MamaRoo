import { VitalsScreen } from "@/app/(app)/care/vitals/VitalsScreen";
import type { VitalRow } from "@/lib/domain/vitals";
import { getVitals } from "@/lib/supabase/queries/vitals";

export default async function CareVitalsPage() {
  const vitals = await getVitals();

  return (
    // Postgres's `kind` check constraint isn't reflected in the generated Row
    // type (it's a plain `string`) -- same loose cast the rest of the codebase
    // uses at this boundary (see AppointmentsPage's `AppointmentRow` cast).
    <VitalsScreen vitals={vitals as unknown as VitalRow[]} />
  );
}
