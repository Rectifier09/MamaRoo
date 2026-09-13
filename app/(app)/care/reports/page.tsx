import { ReportsScreen } from "@/app/(app)/care/reports/ReportsScreen";
import { getReportsData } from "@/lib/supabase/queries/reports";

export default async function CareReportsPage() {
  const reports = await getReportsData();

  return <ReportsScreen initialReports={reports} />;
}
