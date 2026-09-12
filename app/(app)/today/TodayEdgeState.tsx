"use client";

import { useTranslations } from "next-intl";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PRODUCT_NAME } from "@/lib/config";

export type TodayEdgeStateKind =
  | "offline"
  | "missed_task"
  | "returning"
  | "overdue"
  | "save_failed"
  | "pending_reminder";

type Motif = "cloud" | "pill" | "retry" | "calendar";

const MOTIF: Record<TodayEdgeStateKind, Motif | null> = {
  offline: "cloud",
  missed_task: "pill",
  returning: null,
  overdue: null,
  save_failed: "retry",
  pending_reminder: "calendar",
};

const MOTIF_ICON: Record<Motif, string> = {
  cloud: "CloudRain",
  pill: "Pill",
  retry: "ArrowClockwise",
  calendar: "CalendarBlank",
};

const HAS_SUPPORTING: Record<TodayEdgeStateKind, boolean> = {
  offline: true,
  missed_task: false,
  returning: false,
  overdue: true,
  save_failed: false,
  pending_reminder: false,
};

const HAS_SECONDARY: Record<TodayEdgeStateKind, boolean> = {
  offline: false,
  missed_task: true,
  returning: false,
  overdue: false,
  save_failed: true,
  pending_reminder: false,
};

function illustrationFor(
  state: TodayEdgeStateKind,
  stage: { lottieUrl: string; staticSrc: string },
) {
  if (state === "overdue" || state === "returning") return stage;
  return {
    lottieUrl: `/illustrations/edge-${state}-placeholder.json`,
    staticSrc: `/illustrations/edge-${state}-placeholder.svg`,
  };
}

export interface TodayEdgeStateProps {
  state: TodayEdgeStateKind;
  stage: { lottieUrl: string; staticSrc: string };
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function TodayEdgeState({ state, stage, onPrimary, onSecondary }: TodayEdgeStateProps) {
  const t = useTranslations(`today.edge.${state}`);
  const headline = t("headline", { productName: PRODUCT_NAME });
  const illustration = illustrationFor(state, stage);
  const motif = MOTIF[state];

  return (
    <main
      data-testid="today-edge-state"
      className="safe-bottom flex min-h-dvh flex-col items-center bg-surface px-xl pb-xl pt-2xl text-center"
    >
      <div className="relative flex min-h-[420px] w-full flex-1 items-center justify-center">
        <div
          data-testid="edge-illustration-shell"
          data-dimmed={state === "offline" ? "true" : "false"}
          style={{ opacity: state === "offline" ? 0.55 : 1, filter: state === "offline" ? "grayscale(0.2)" : "none" }}
        >
          <IllustrationContainer
            lottieUrl={illustration.lottieUrl}
            staticSrc={illustration.staticSrc}
            alt={headline}
          />
        </div>
        {motif && (
          <span
            data-testid={`edge-motif-${motif}`}
            className={`absolute right-[8%] top-[8%] flex size-11 items-center justify-center rounded-full text-text-primary shadow-2 ${
              motif === "calendar" ? "bg-gold" : "bg-surface-raised"
            }`}
            aria-hidden="true"
          >
            <Icon name={MOTIF_ICON[motif]} size="default" />
          </span>
        )}
      </div>

      <div className="mt-sm flex w-full flex-col items-center gap-sm">
        <h1 className="max-w-[20ch] text-balance text-h1 font-display text-text-primary">{headline}</h1>
        {HAS_SUPPORTING[state] && (
          <p className="max-w-[34ch] text-body text-text-secondary">{t("supporting")}</p>
        )}
      </div>

      <div className="mt-xl flex w-full max-w-md flex-col items-center gap-md">
        <Button type="button" className="w-full" onClick={onPrimary}>
          {t("primary")}
        </Button>
        {HAS_SECONDARY[state] && onSecondary && (
          <Button type="button" variant="tertiary" onClick={onSecondary}>
            {t("secondary")}
          </Button>
        )}
      </div>
    </main>
  );
}
