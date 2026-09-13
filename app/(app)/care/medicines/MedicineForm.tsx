"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createMedicine, type CreateMedicineResult } from "@/app/actions/medicines";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { todayInAppZone } from "@/lib/domain/dates";
import { validateMedicine, type MedicineValue } from "@/lib/domain/medicines";
import { useOnline } from "@/lib/pwa/useOnline";
import type { Database } from "@/lib/supabase/database.types";

type MedicineRow = Database["public"]["Tables"]["medicines"]["Row"];

export interface MedicineFormProps {
  existingActiveNames: string[];
  onSave?: (input: MedicineValue) => Promise<CreateMedicineResult>;
  onSaved: (medicine: MedicineRow) => void;
  onCancel: () => void;
}

// The design's "Remind me" toggle and prescription-photo attach both need a
// column/storage path this session doesn't add (`medicines` has no reminder
// flag, and photo upload is Session 26's storage work). Every medicine with a
// scheduled time already produces a Today reminder, so this omission changes
// nothing observable yet -- same kind of honest gap as BabyScreen's
// sensitiveMode and Today's showWeeklyReflection.
export function MedicineForm({
  existingActiveNames,
  onSave = createMedicine,
  onSaved,
  onCancel,
}: MedicineFormProps) {
  const t = useTranslations("care.medicines");
  const tCommon = useTranslations("common");
  const online = useOnline();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function buildInput(nextName: string, nextTimes: string[]) {
    return {
      name: nextName,
      scheduleTimes: nextTimes.filter(Boolean),
      startDate: todayInAppZone(),
      dosage,
      notes,
      existingActiveNames,
    };
  }

  function revalidate(nextName: string, nextTimes: string[]) {
    const result = validateMedicine(buildInput(nextName, nextTimes));
    setWarnings(result.ok ? result.warnings : {});
  }

  function updateName(value: string) {
    setName(value);
    revalidate(value, times);
  }

  function updateTime(index: number, value: string) {
    const next = times.map((time, i) => (i === index ? value : time));
    setTimes(next);
    revalidate(name, next);
  }

  function addTime() {
    setTimes((prev) => [...prev, ""]);
  }

  function removeTime(index: number) {
    setTimes((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!online || saving) return;

    const input = buildInput(name, times);
    const result = validateMedicine(input);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const saved = await onSave(result.value);
      if (!saved.ok) {
        setErrors({ name: saved.error });
        return;
      }
      onSaved(saved.medicine);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      {!online && (
        <p role="status" className="rounded-sm bg-surface px-md py-sm text-body-sm text-text-secondary">
          {t("offline")}
        </p>
      )}

      <Input
        id="medicine-name"
        label={t("nameLabel")}
        placeholder={t("namePlaceholder")}
        value={name}
        onChange={(e) => updateName(e.target.value)}
        {...(errors.name ? { error: errors.name } : {})}
      />
      {!errors.name && warnings.name && (
        <p className="text-caption text-text-secondary">{warnings.name}</p>
      )}

      <Input
        id="medicine-dosage"
        label={t("doseLabel")}
        placeholder={t("dosePlaceholder")}
        value={dosage}
        onChange={(e) => setDosage(e.target.value)}
      />

      <div className="flex flex-col gap-sm">
        <span className="text-body-sm text-text-secondary">{t("timeLabel")}</span>
        {times.map((time, i) => (
          <div key={i} className="flex items-center gap-sm">
            <label className="sr-only" htmlFor={`medicine-time-${i}`}>
              {t("timeLabel")}
            </label>
            <input
              id={`medicine-time-${i}`}
              type="time"
              value={time}
              onChange={(e) => updateTime(i, e.target.value)}
              className="min-h-[48px] flex-1 rounded-sm border border-divider bg-surface px-md py-sm text-body"
            />
            {times.length > 1 && (
              <button
                type="button"
                aria-label={t("removeTime")}
                onClick={() => removeTime(i)}
                className="tap-target text-caption text-text-secondary underline"
              >
                {t("removeTime")}
              </button>
            )}
          </div>
        ))}
        {errors.scheduleTimes && <p className="text-caption text-alert">{errors.scheduleTimes}</p>}
        <button type="button" onClick={addTime} className="tap-target self-start text-caption text-accent-primary underline">
          {t("addTime")}
        </button>
      </div>

      <div className="flex flex-col gap-xs">
        <label htmlFor="medicine-notes" className="text-body-sm text-text-secondary">
          {t("instructionsLabel")}
        </label>
        <textarea
          id="medicine-notes"
          placeholder={t("instructionsPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[56px] rounded-sm border border-divider bg-surface px-md py-sm text-body"
        />
      </div>

      <div className="mt-sm flex gap-sm">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          {tCommon("cancel")}
        </Button>
        <Button
          type="button"
          loading={saving}
          onClick={() => void submit()}
          {...(!online ? { disabledReason: t("offline") } : {})}
          className="flex-1"
        >
          {t("saveButton")}
        </Button>
      </div>
    </div>
  );
}
