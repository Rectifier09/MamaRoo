import { ActivityFeed } from "@/app/(app)/today/activity/ActivityFeed";
import { buildActivityFeed, groupActivityByDay } from "@/lib/domain/activity";
import { todayInAppZone } from "@/lib/domain/dates";
import { getRecentActivity } from "@/lib/supabase/queries/activity";

export default async function ActivityPage() {
  const now = new Date();
  const data = await getRecentActivity({ now });
  const entries = buildActivityFeed({
    checkins: data.checkins.map((checkin) => ({
      id: checkin.id,
      feeling:
        checkin.feeling === "good" || checkin.feeling === "new" || checkin.feeling === "worried"
          ? checkin.feeling
          : null,
      created_at: checkin.created_at,
      body: checkin.body,
    })),
    medicineLogs: data.medicineLogs
      .filter(
        (log) =>
          (log.status === "taken" || log.status === "skipped") && Boolean(log.medicines?.name),
      )
      .map((log) => ({
        id: log.id,
        medicine_name: log.medicines?.name ?? "",
        status: log.status as "taken" | "skipped",
        logged_at: log.logged_at,
      })),
    milestones: data.milestones,
    appointments: data.appointments,
    wellnessEvents: data.wellnessEvents,
    now: now.getTime(),
  });
  const groups = groupActivityByDay({ entries, today: todayInAppZone(now) });

  return <ActivityFeed groups={groups} />;
}
