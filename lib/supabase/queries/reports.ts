import { sortReportsByDate, type ReportRecord } from "@/lib/domain/reports";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

function toReport(row: ReportRow): ReportRecord {
  return {
    id: row.id,
    title: row.title,
    reportType: row.report_type,
    reportDate: row.report_date,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    pageCount: row.page_count,
    createdAt: row.created_at,
  };
}

export async function getReportsData(): Promise<ReportRecord[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select("id,title,report_type,report_date,mime_type,size_bytes,page_count,created_at")
    .order("report_date", { ascending: false });
  if (error) throw error;

  return sortReportsByDate(((data ?? []) as ReportRow[]).map(toReport));
}
