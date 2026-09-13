import { MedicinesScreen } from "@/app/(app)/care/medicines/MedicinesScreen";
import { adherenceGrid } from "@/lib/domain/adherence";
import { addDays, todayInAppZone } from "@/lib/domain/dates";
import { buildMedicineListItems } from "@/lib/domain/medicines";
import { getCareMedicinesData } from "@/lib/supabase/queries/care";

const ADHERENCE_WINDOW_DAYS = 13; // 14 days inclusive, matching the design's day-grid

export default async function CareMedicinesPage() {
  const today = todayInAppZone();
  const from = addDays(today, -ADHERENCE_WINDOW_DAYS);
  const data = await getCareMedicinesData();

  const items = buildMedicineListItems({
    // Postgres check constraints (status, etc.) aren't reflected in the generated
    // Row type -- same loose cast the rest of the codebase uses at this boundary
    // (see BabyPage's timelineEvents cast).
    medicines: data.medicines.map((m) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      schedule_times: m.schedule_times,
      days_of_week: m.days_of_week,
      start_date: m.start_date,
      end_date: m.end_date,
      is_active: m.is_active,
    })),
    logs: data.logs as unknown as { medicine_id: string; scheduled_date: string; scheduled_time: string; status: "taken" | "skipped" }[],
    today,
  });

  const cells = adherenceGrid({
    medicines: data.medicines,
    logs: data.logs as unknown as { medicine_id: string; scheduled_date: string; scheduled_time: string; status: "taken" | "skipped" }[],
    from,
    to: today,
  });

  return (
    <MedicinesScreen
      today={today}
      items={items}
      cells={cells}
      existingActiveNames={data.medicines.map((m) => m.name)}
    />
  );
}
