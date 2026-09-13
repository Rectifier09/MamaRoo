import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";

export interface CareHubProps {
  medicineText: string | null;
  appointmentText: string | null;
  reportText: string | null;
  adviceText: string | null;
  questionsCount: number;
  notesText: string | null;
}

/**
 * Every tile links to its fixed route up front, even before the session that
 * builds that route lands (Session 22 replan, Decision "wire once") -- so no
 * later session needs to touch this file again. The notes card was the one
 * exception at Session 22 time (no `personal_notes` table yet); Session 22A
 * wires its preview the same way as every other card.
 */
export function CareHub({
  medicineText,
  appointmentText,
  reportText,
  adviceText,
  questionsCount,
  notesText,
}: CareHubProps) {
  const t = useTranslations("care");

  const questionsText =
    questionsCount > 0 ? t("hub.questionsReady", { count: questionsCount }) : t("hub.questionsPrompt");

  return (
    <div className="flex flex-col gap-lg py-screen">
      <h1 className="font-display text-h1 text-text-primary">{t("heading")}</h1>

      <div className="grid grid-cols-2 gap-md">
        <Link href="/care/medicines">
          <Card className="flex flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.medicineLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{medicineText ?? t("hub.medicinePrompt")}</p>
          </Card>
        </Link>

        <Link href="/care/appointments">
          <Card className="flex flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.appointmentLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{appointmentText ?? t("hub.appointmentPrompt")}</p>
          </Card>
        </Link>

        <Link href="/care/reports">
          <Card className="flex flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.reportLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{reportText ?? t("hub.reportPrompt")}</p>
          </Card>
        </Link>

        <Link href="/care/advice">
          <Card className="flex flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.adviceLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{adviceText ?? t("hub.advicePrompt")}</p>
          </Card>
        </Link>
      </div>

      <Link href="/care/questions">
        <Card className="flex items-center gap-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.questionsLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{questionsText}</p>
          </div>
        </Card>
      </Link>

      <Link href="/care/summary">
        <Card className="flex items-center gap-md bg-peach">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="font-display text-body font-semibold text-text-primary">{t("hub.summaryTitle")}</p>
            <p className="text-body-sm text-text-primary">{t("hub.summaryLine")}</p>
            <span className="mt-xs inline-flex w-fit rounded-full bg-accent-primary px-md py-xs text-caption font-semibold text-surface-raised">
              {t("hub.summaryCta")}
            </span>
          </div>
        </Card>
      </Link>

      <Link href="/care/notes">
        <Card className="flex items-center gap-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.notesLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{notesText ?? t("hub.notesPrompt")}</p>
          </div>
        </Card>
      </Link>
    </div>
  );
}
