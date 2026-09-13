"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toggleAdviceReminder } from "@/app/actions/advice";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { latestUpdate, type AdviceRecord, type AdviceType } from "@/lib/domain/advice";

const TYPE_ICON: Record<AdviceType, string> = {
  medicine: "Pill",
  test: "TestTube",
  scan: "Image",
  appointment: "CalendarBlank",
  diet: "ForkKnife",
  exercise: "PersonSimpleRun",
  question: "Question",
  other: "FileText",
};

export interface AdviceListProps {
  items: AdviceRecord[];
  onEdit: (advice: AdviceRecord) => void;
  onToggleReminder?: typeof toggleAdviceReminder;
  onReminderToggled?: (adviceId: string, isReminder: boolean) => void;
}

export function AdviceList({ items, onEdit, onToggleReminder = toggleAdviceReminder, onReminderToggled }: AdviceListProps) {
  const t = useTranslations("advice");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  async function handleToggle(advice: AdviceRecord, next: boolean) {
    setPendingIds((prev) => new Set(prev).add(advice.id));
    try {
      const result = await onToggleReminder({ adviceId: advice.id, isReminder: next });
      if (result.ok) onReminderToggled?.(advice.id, result.isReminder);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(advice.id);
        return next;
      });
    }
  }

  if (items.length === 0) {
    return <EmptyState iconName="ClipboardText" message={t("empty")} />;
  }

  return (
    <ol className="flex flex-col gap-sm">
      {items.map((advice) => {
        const last = latestUpdate(advice);
        if (!last) return null;
        return (
          <li key={advice.id} className="flex flex-col gap-sm rounded-[16px] bg-surface-raised p-md shadow-1">
            <button
              type="button"
              onClick={() => onEdit(advice)}
              className="tap-target flex items-start gap-sm text-left"
            >
              <span
                aria-hidden="true"
                className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-blush text-accent-primary"
              >
                <Icon name={TYPE_ICON[advice.type]} size="inline" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-semibold text-text-primary">{last.body}</span>
                <span className="block text-caption text-text-secondary">{last.doctorName ?? t("unnamedDoctor")}</span>
              </span>
            </button>

            <Toggle
              id={`advice-reminder-${advice.id}`}
              label={advice.isReminder ? t("confirmedStatus") : t("unconfirmedStatus")}
              checked={advice.isReminder}
              disabled={pendingIds.has(advice.id)}
              onCheckedChange={(next) => void handleToggle(advice, next)}
            />
          </li>
        );
      })}
    </ol>
  );
}
