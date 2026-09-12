"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";
import { FeelingBox, type Feeling } from "@/app/(app)/today/FeelingBox";
import { TodayEdgeState } from "@/app/(app)/today/TodayEdgeState";
import { MedicineQuickActionSheet } from "@/app/(app)/today/MedicineQuickActionSheet";
import { TriageResult, type TriageResultProps } from "@/app/(app)/today/TriageResult";
import type { Reminder } from "@/lib/domain/reminders";
import type { Transcriber } from "@/lib/speech/transcribe";
import type { SaveCheckinResult } from "@/app/actions/checkin";

export interface ReadingCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: "article" | "video" | "audio";
}

export interface TodayScreenProps {
  displayName: string;
  week: number;
  babyCount: 1 | 2;
  isPostTerm: boolean;
  stage: { lottieUrl: string; staticSrc: string };
  reminders: Reminder[];
  reading: ReadingCard[];
  showWeeklyReflection: boolean;
  weeklyReflectionText: string;
  showCheckupNudge: boolean;
  transcriber: Transcriber;
  onSubmitCheckin: (input: {
    text: string;
    feeling: Feeling | null;
    inputMethod: "text" | "voice";
  }) => Promise<SaveCheckinResult>;
  doctorName: string | null;
  clinicName: string | null;
}

/** "20:00" (stored, 24h) -> "8:00 PM". Reminder times never carry a date, so
 * this stays a pure string transform rather than going through Date/Intl. */
function formatTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour24 = Number.parseInt(hourStr ?? "0", 10);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
}

export function TodayScreen({
  displayName,
  week,
  babyCount,
  isPostTerm,
  stage,
  reminders,
  reading,
  showWeeklyReflection,
  weeklyReflectionText,
  showCheckupNudge,
  transcriber,
  onSubmitCheckin,
  doctorName,
  clinicName,
}: TodayScreenProps) {
  const t = useTranslations("today");
  const [checkinResult, setCheckinResult] = useState<
    (Pick<TriageResultProps, "severity" | "guidance"> & { feeling: Feeling | null }) | null
  >(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isPostTerm) {
    return (
      <TodayEdgeState
        state="overdue"
        stage={stage}
        onPrimary={() => {
          /* "Continue" simply dismisses back to a normal render on the next visit --
             there is nothing else to do here, since the holding message IS the
             normal state for a post-term pregnancy until her dates are updated. */
        }}
      />
    );
  }

  const nextReminder = reminders[0] ?? null;
  const reminderText = !nextReminder
    ? t("reminders.nothingDue")
    : nextReminder.kind === "dose"
      ? t("reminders.dose", { medicineName: nextReminder.medicineName, time: formatTime(nextReminder.scheduledTime) })
      : t("reminders.appointment", { title: nextReminder.title });

  async function handleCheckinSubmit(input: { text: string; feeling: Feeling | null; inputMethod: "text" | "voice" }) {
    const result = await onSubmitCheckin(input);
    if (result.ok) {
      setCheckinResult({ severity: result.severity, guidance: result.guidance, feeling: input.feeling });
    }
    // A failed save hands off to TodayEdgeState's save_failed state, wired by
    // the page-level parent that owns retry/navigation; this component only
    // needs to not crash on a non-ok result, which it doesn't.
  }

  return (
    <div className="flex flex-col gap-lg py-screen">
      <div className="flex flex-col items-center gap-sm">
        <div className="flex justify-center gap-sm">
          {Array.from({ length: babyCount }, (_, i) => (
            <IllustrationContainer
              key={i}
              lottieUrl={stage.lottieUrl}
              staticSrc={stage.staticSrc}
              alt={babyCount > 1 ? t("weekTagTwins", { week }) : t("weekTag", { week })}
            />
          ))}
        </div>
        <span className="rounded-full bg-surface-raised px-md py-xs text-body-sm font-medium text-text-primary shadow-1">
          {babyCount > 1 ? t("weekTagTwins", { week }) : t("weekTag", { week })}
        </span>
        <p className="text-body text-text-primary">{t("greeting", { name: displayName })}</p>
      </div>

      {nextReminder ? (
        <button
          type="button"
          data-testid="next-reminder"
          onClick={() => {
            if (nextReminder.kind === "dose") setSheetOpen(true);
          }}
          className="flex items-center justify-center gap-sm text-body-sm text-text-primary"
        >
          {t("reminders.next", { reminder: reminderText })}
        </button>
      ) : (
        <p data-testid="next-reminder" className="text-center text-body-sm text-text-secondary">
          {reminderText}
        </p>
      )}

      <div data-testid="primary-emphasis">
        <FeelingBox onSubmit={handleCheckinSubmit} transcriber={transcriber} />
      </div>

      {checkinResult && (
        <TriageResult
          severity={checkinResult.severity}
          guidance={checkinResult.guidance}
          feeling={checkinResult.feeling}
          doctorName={doctorName}
          clinicName={clinicName}
        />
      )}

      <Link
        href="/today/activity"
        className="tap-target mx-auto flex items-center gap-sm rounded-full bg-surface-raised px-lg py-sm text-body-sm font-medium text-text-primary shadow-1"
      >
        {t("seeLoggedBefore")}
      </Link>

      <div className="flex flex-col gap-md">
        <h2 className="text-h3 font-display text-text-primary">{t("forYouToday")}</h2>
        <div className="grid grid-cols-2 gap-md">
          {reading.map((item) => (
            <Link key={item.id} href={`/today/listen/${item.slug}`} className="col-span-2">
              <Card className="flex flex-col gap-sm">
                <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                  {item.title}
                </p>
                <p className="text-body-sm text-text-primary">{item.summary}</p>
              </Card>
            </Link>
          ))}

          <Link href="/today/meal-plan" className="col-span-2">
            <Card className="flex flex-col gap-sm">
              <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t("mealPlanCardLabel")}
              </p>
              <p className="text-body-sm text-text-primary">{t("mealPlanCardBody")}</p>
            </Card>
          </Link>
        </div>
      </div>

      {showWeeklyReflection && (
        <div className="rounded-lg bg-[rgba(255,164,143,0.14)] p-lg">
          <p className="text-body text-text-primary">{weeklyReflectionText}</p>
        </div>
      )}

      {showCheckupNudge && (
        <Link
          href="/care/questions"
          className="tap-target flex items-center gap-md rounded-lg bg-gold p-md text-left shadow-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-text-primary">{t("checkupNudgeTitle")}</p>
            <p className="text-body-sm text-text-secondary">{t("checkupNudgeBody")}</p>
          </div>
        </Link>
      )}

      {nextReminder && nextReminder.kind === "dose" && (
        <MedicineQuickActionSheet
          open={sheetOpen}
          medicineId={nextReminder.refId}
          medicineName={nextReminder.medicineName}
          scheduledDate={new Date().toISOString().slice(0, 10)}
          scheduledTime={formatTime(nextReminder.scheduledTime)}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
