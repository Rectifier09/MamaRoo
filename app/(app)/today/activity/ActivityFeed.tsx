"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { APP_TIMEZONE } from "@/lib/config";
import type { ActivityEntry, ActivityGroup, ActivityKind } from "@/lib/domain/activity";

function iconFor(kind: ActivityKind) {
  switch (kind) {
    case "moodGood":
      return { name: "Smiley", family: "mood-good", tone: "bg-[rgba(255,109,87,0.18)] text-accent-primary" };
    case "moodNew":
      return { name: "SmileyMeh", family: "mood-new", tone: "bg-[rgba(255,109,87,0.18)] text-accent-primary" };
    case "moodWorried":
      return { name: "SmileySad", family: "mood-worried", tone: "bg-[rgba(255,109,87,0.18)] text-accent-primary" };
    case "medicineTaken":
    case "medicineSkipped":
      return { name: "Pill", family: "medicine", tone: "bg-[rgba(103,0,53,0.08)] text-text-primary" };
    case "wellness":
      return { name: "Lightning", family: "wellness", tone: "bg-[rgba(157,221,161,0.32)] text-accent-secondary" };
    case "milestone":
      return { name: "Star", family: "milestone", tone: "bg-[rgba(255,197,61,0.32)] text-text-primary" };
    case "appointment":
      return { name: "CalendarBlank", family: "appointment", tone: "bg-[rgba(103,0,53,0.08)] text-text-primary" };
  }
}

function entryText(entry: ActivityEntry, t: ReturnType<typeof useTranslations>) {
  switch (entry.kind) {
    case "moodGood":
    case "moodNew":
    case "moodWorried":
      return t(`activity.${entry.kind}`);
    case "medicineTaken":
    case "medicineSkipped":
      return t(`activity.${entry.kind}`, { medicineName: entry.params.medicineName ?? "" });
    case "wellness":
      return t("activity.wellness", { label: entry.params.label ?? "" });
    case "milestone":
      // TODO(Session 20): resolve params.titleKey with the base translator before passing it as {title}.
      return t("activity.milestone", { title: entry.params.title ?? entry.params.titleKey ?? "" });
    case "appointment":
      return t("activity.appointment", { title: entry.params.title ?? "" });
  }
}

function ActivityRow({ entry, showConnector }: { entry: ActivityEntry; showConnector: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const icon = iconFor(entry.kind);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(new Date(entry.occurredAt));

  return (
    <li className="flex gap-md" data-activity-kind={entry.kind}>
      <div className="flex shrink-0 flex-col items-center">
        <span
          data-kind-icon={entry.kind}
          data-icon-family={icon.family}
          className={`flex size-[34px] items-center justify-center rounded-full ${icon.tone}`}
        >
          <Icon name={icon.name} size="inline" />
        </span>
        {showConnector && (
          <span
            data-testid="activity-connector"
            aria-hidden="true"
            className="mt-xs min-h-[18px] w-0.5 flex-1 bg-[rgba(103,0,53,0.12)]"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 pb-md">
        <p className="text-body-sm text-text-primary">{entryText(entry, t)}</p>
        <time dateTime={entry.occurredAt} className="text-caption text-text-secondary">
          {time}
        </time>
      </div>
    </li>
  );
}

export function ActivityFeed({ groups }: { groups: ActivityGroup[] }) {
  const t = useTranslations();

  return (
    <section className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen" aria-labelledby="activity-title">
      <header className="flex items-center gap-md border-b border-[rgba(103,0,53,0.08)] pb-md">
        <Link
          href="/today"
          aria-label={t("today.backToToday")}
          className="tap-target inline-flex items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <h1 id="activity-title" className="font-display text-h2 font-semibold text-text-primary">
          {t("activity.title")}
        </h1>
      </header>

      {groups.length === 0 ? (
        <EmptyState iconName="Notebook" message={t("activity.empty")} />
      ) : (
        <div className="flex flex-col gap-lg">
          {groups.map((group) => (
            <section key={group.labelKey} aria-labelledby={`group-${group.labelKey}`}>
              <h2
                id={`group-${group.labelKey}`}
                className="mb-sm text-caption font-medium uppercase tracking-[0.04em] text-text-secondary"
              >
                {t(group.labelKey)}
              </h2>
              <ol>
                {group.entries.map((entry, index) => (
                  <ActivityRow key={entry.id} entry={entry} showConnector={index < group.entries.length - 1} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
