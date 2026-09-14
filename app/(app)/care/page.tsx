import { CareHub } from "@/app/(app)/care/CareHub";
import { notePreview } from "@/lib/domain/notes";
import { getCareHubData } from "@/lib/supabase/queries/care";

const CARD_PREVIEW_MAX_CHARS = 80;

export default async function CarePage() {
  const data = await getCareHubData();

  const nextMedicine = data.medicines[0] ?? null;
  const medicineText = nextMedicine
    ? `${nextMedicine.name}, ${nextMedicine.schedule_times[0]?.slice(0, 5) ?? ""}`.trim().replace(/,\s*$/, "")
    : null;

  const appointmentText = data.nextAppointment
    ? `${data.nextAppointment.doctor_name ?? data.nextAppointment.title} on ${data.nextAppointment.scheduled_at.slice(0, 10)}`
    : null;

  const vitalsText = data.latestVital
    ? data.latestVital.kind === "weight"
      ? `${data.latestVital.value_1} kg on ${data.latestVital.measured_on}`
      : `${data.latestVital.value_1}/${data.latestVital.value_2} mmHg on ${data.latestVital.measured_on}`
    : null;

  const reportText = data.latestReport
    ? `${data.latestReport.report_type}, added ${data.latestReport.report_date}`
    : null;

  const adviceText = data.latestAdvice ? notePreview(data.latestAdvice.body, CARD_PREVIEW_MAX_CHARS) : null;

  const notesText = data.latestNote ? notePreview(data.latestNote.body, CARD_PREVIEW_MAX_CHARS) : null;

  return (
    <CareHub
      medicineText={medicineText}
      appointmentText={appointmentText}
      vitalsText={vitalsText}
      reportText={reportText}
      adviceText={adviceText}
      questionsCount={data.markedQuestionCount}
      notesText={notesText}
    />
  );
}
