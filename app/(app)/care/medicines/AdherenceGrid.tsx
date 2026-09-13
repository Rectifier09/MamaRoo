"use client";

import { useTranslations } from "next-intl";
import { adherenceRatio, type AdherenceCell } from "@/lib/domain/adherence";
import { cn } from "@/lib/cn";

type CellState = "none" | "complete" | "partial" | "skipped" | "unlogged";

function cellState(cell: AdherenceCell): CellState {
  if (cell.expected === 0) return "none";
  if (cell.taken === cell.expected) return "complete";
  if (cell.taken > 0) return "partial";
  if (cell.skipped > 0) return "skipped";
  return "unlogged";
}

const GLYPH: Record<CellState, string> = {
  none: "·",
  complete: "✓",
  partial: "◐",
  skipped: "–",
  unlogged: "○",
};

const STYLE: Record<CellState, string> = {
  none: "bg-transparent text-text-secondary",
  complete: "bg-accent-secondary text-surface-raised",
  partial: "bg-surface-raised text-accent-secondary border border-accent-secondary",
  skipped: "bg-surface-raised text-text-secondary border border-divider",
  unlogged: "bg-surface-raised text-text-secondary border border-dashed border-divider",
};

/** A visual, per-day adherence grid -- see Session 22, Step 5. Every cell carries
 * a data-state attribute and a distinct glyph, never colour alone, and an
 * accessible label naming the date and the state in gentle language. */
export function AdherenceGrid({ cells }: { cells: AdherenceCell[] }) {
  const t = useTranslations("care.medicines.adherence");
  const ratio = adherenceRatio(cells);

  const stateLabel: Record<CellState, string> = {
    none: t("stateNone"),
    complete: t("stateTaken"),
    partial: t("stateTaken"),
    skipped: t("stateSkipped"),
    unlogged: t("stateUnlogged"),
  };

  return (
    <div className="flex flex-col gap-sm">
      <p className="text-body-sm text-text-secondary">{t("summary", { taken: ratio.taken, expected: ratio.expected })}</p>
      <div className="flex flex-wrap gap-xs">
        {cells.map((cell) => {
          const state = cellState(cell);
          return (
            <span
              key={cell.date}
              data-testid="adherence-cell"
              data-state={state}
              aria-label={t("cellLabel", { date: cell.date, state: stateLabel[state] })}
              className={cn(
                "flex size-[28px] items-center justify-center rounded-sm text-caption font-medium",
                STYLE[state],
              )}
            >
              <span aria-hidden="true">{GLYPH[state]}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
