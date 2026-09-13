import { CareHub } from "@/app/(app)/care/CareHub";
import { getCareHubData } from "@/lib/supabase/queries/care";

const ADVICE_PREVIEW_MAX_CHARS = 80;

export default async function CarePage() {
  const data = await getCareHubData();

  const nextMedicine = data.medicines[0] ?? null;
  const medicineText = nextMedicine
    ? `${nextMedicine.name}, ${nextMedicine.schedule_times[0]?.slice(0, 5) ?? ""}`.trim().replace(/,\s*$/, "")
    : null;

  const appointmentText = data.nextAppointment
    ? `${data.nextAppointment.doctor_name ?? data.nextAppointment.title} on ${data.nextAppointment.scheduled_at.slice(0, 10)}`
    : null;

  const reportText = data.latestReport
    ? `${data.latestReport.report_type}, added ${data.latestReport.report_date}`
    : null;

  const adviceText = data.latestAdvice
    ? data.latestAdvice.body.length > ADVICE_PREVIEW_MAX_CHARS
      ? `${data.latestAdvice.body.slice(0, ADVICE_PREVIEW_MAX_CHARS).trimEnd()}…`
      : data.latestAdvice.body
    : null;

  return (
    <CareHub
      medicineText={medicineText}
      appointmentText={appointmentText}
      reportText={reportText}
      adviceText={adviceText}
      questionsCount={data.markedQuestionCount}
    />
  );
}
