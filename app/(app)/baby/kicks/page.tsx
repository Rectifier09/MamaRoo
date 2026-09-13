import { redirect } from "next/navigation";
import { KickCounter } from "@/app/(app)/baby/kicks/KickCounter";
import { finishKickSession, recordKick, startKickSession } from "@/app/actions/kicks";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function KicksPage() {
  const result = await startKickSession();
  // Not authenticated is the only realistic failure here (RLS already scopes
  // everything else) -- send her back to sign in rather than render a broken
  // counter with no session behind it.
  if (!result.ok) redirect("/signin");

  const supabase = await createServerSupabase();
  const { data: pregnancy } = await supabase.from("pregnancies").select("edd").eq("status", "active").maybeSingle();
  const week = pregnancy ? pregnancyProgress({ edd: pregnancy.edd, today: todayInAppZone() }).week : 0;

  return (
    <KickCounter session={result.session} week={week} onRecordKick={recordKick} onFinish={finishKickSession} />
  );
}
