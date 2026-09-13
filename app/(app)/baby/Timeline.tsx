"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/patterns/EmptyState";
import { cn } from "@/lib/cn";
import type { TimelineEntry } from "@/lib/domain/timeline";

const VIEWS = ["day", "week", "month"] as const;
type View = (typeof VIEWS)[number];

/** Beyond this many dots, the strip collapses behind a "show all" action
 * rather than rendering an unbounded row -- matches Session 20's own test
 * requirement ("a long timeline uses the show-more pattern beyond 15
 * entries"). buildTimeline() itself stays unbounded (a domain concern isn't
 * pagination); this is purely a rendering choice. */
const COLLAPSED_COUNT = 15;

/**
 * Day/Week/Month only changes how far back the strip reaches, not which
 * entries qualify as "hers" -- there's no separate weekly-growth-dot content
 * system here (the designer mockup's "carrot"/"mango" size copy per week
 * isn't seeded content anywhere yet; see Important/Plan-Sessions-20-21-Replan.md).
 * This is the deliberately smaller, honest version of that toggle: a look-back
 * window over the same merged timeline, not a second data model.
 */
const LOOKBACK_DAYS: Record<View, number> = { day: 30, week: 90, month: 400 };

export function Timeline({
  entries,
  onSelect,
}: {
  entries: TimelineEntry[];
  onSelect?: (entry: TimelineEntry | null) => void;
}) {
  const t = useTranslations("baby");
  const [view, setView] = useState<View>("week");
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMilestoneId, setOpenMilestoneId] = useState<string | null>(null);
  // Read once at mount via the lazy initializer (not a bare Date.now() call in
  // render), same pattern as app/(auth)/AuthForm.tsx -- keeps the component
  // pure per react-hooks/purity while still anchoring the look-back window to
  // "now". A day/week/month filter doesn't need to tick live like AuthForm's
  // resend-timer does, so no interval re-sets it.
  const [now] = useState<number>(() => Date.now());

  const windowed = useMemo(() => {
    const cutoff = now - LOOKBACK_DAYS[view] * 24 * 60 * 60 * 1000;
    return entries.filter((e) => new Date(e.occurredAt).getTime() >= cutoff);
  }, [entries, view, now]);

  const visible = expanded ? windowed : windowed.slice(0, COLLAPSED_COUNT);
  const hasMore = windowed.length > COLLAPSED_COUNT && !expanded;

  function select(entry: TimelineEntry) {
    const next = selectedId === entry.id ? null : entry;
    setSelectedId(next?.id ?? null);
    onSelect?.(next);
    if (entry.kind === "milestone") setOpenMilestoneId(entry.id);
  }

  if (entries.length === 0) {
    return <EmptyState iconName="Sparkle" message={t("timeline.empty")} />;
  }

  const openMilestone = visible.find((e) => e.id === openMilestoneId && e.kind === "milestone");

  return (
    <div className="flex flex-col gap-sm">
      <div role="tablist" aria-label={t("timeline.viewLabel")} className="flex gap-xs">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "tap-target rounded-full px-md py-xs text-body-sm font-medium",
              view === v ? "bg-accent-primary text-on-accent" : "text-text-secondary",
            )}
          >
            {t(`timeline.view.${v}`)}
          </button>
        ))}
      </div>

      <div className="flex gap-sm overflow-x-auto pb-xs" data-testid="timeline-strip">
        {visible.map((entry) => {
          const isMilestone = entry.kind === "milestone";
          const isSelected = selectedId === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              data-testid="timeline-dot"
              data-kind={entry.kind}
              aria-label={isMilestone ? t(entry.titleKey) : entry.title}
              aria-pressed={isSelected}
              onClick={() => select(entry)}
              className={cn(
                "tap-target h-[14px] w-[14px] shrink-0 rounded-full",
                isSelected ? "ring-2 ring-accent-primary" : isMilestone ? "ring-2 ring-gold" : "ring-1 ring-divider",
                entry.kind === "event" ? "bg-surface-raised" : "bg-accent-secondary",
              )}
            />
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          data-testid="timeline-show-more"
          onClick={() => setExpanded(true)}
          className="self-start text-body-sm font-medium text-accent-primary"
        >
          {t("timeline.showAll", { count: windowed.length })}
        </button>
      )}

      {openMilestone && openMilestone.kind === "milestone" && (
        <div role="dialog" aria-label={t(openMilestone.titleKey)} className="rounded-lg bg-surface-raised p-md shadow-1">
          <p className="text-body font-semibold text-text-primary">{t(openMilestone.titleKey)}</p>
          <p className="text-body-sm text-text-secondary">{t(`${openMilestone.titleKey}Body`)}</p>
          <button
            type="button"
            onClick={() => setOpenMilestoneId(null)}
            className="mt-sm text-body-sm font-medium text-accent-primary"
          >
            {t("timeline.close")}
          </button>
        </div>
      )}
    </div>
  );
}
