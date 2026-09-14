"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addVital, type AddVitalInput, type AddVitalResult } from "@/app/actions/vitals";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { todayInAppZone } from "@/lib/domain/dates";
import { plausibility, type VitalKind } from "@/lib/domain/vitals";
import { useOnline } from "@/lib/pwa/useOnline";

export interface VitalFormProps {
  kind: VitalKind;
  onSave?: (input: AddVitalInput) => Promise<AddVitalResult>;
  onSaved: (result: Extract<AddVitalResult, { ok: true }>) => void;
  onClose: () => void;
}

// `plausibility()` returns fully-qualified keys ("vitals.errors.weightRange")
// so the same key works from any namespace-less caller (the server action
// included). This component's own translator is scoped to "vitals", so the
// leading segment is stripped before lookup.
function stripNamespace(key: string): string {
  return key.replace(/^vitals\./, "");
}

export function VitalForm({ kind, onSave = addVital, onSaved, onClose }: VitalFormProps) {
  const t = useTranslations("vitals");
  const tCommon = useTranslations("common");
  const online = useOnline();

  const [measuredOn, setMeasuredOn] = useState(todayInAppZone());
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnKey, setWarnKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function revalidate(nextValue1: string, nextValue2: string) {
    const v1 = Number(nextValue1);
    const v2 = kind === "bp" ? Number(nextValue2) : undefined;
    if (!nextValue1 || Number.isNaN(v1) || (kind === "bp" && (!nextValue2 || Number.isNaN(v2)))) {
      setWarnKey(null);
      return;
    }
    const result = plausibility({ kind, value1: v1, ...(v2 !== undefined ? { value2: v2 } : {}) });
    setWarnKey(result.ok && "warnKey" in result ? stripNamespace(result.warnKey) : null);
  }

  function updateValue1(next: string) {
    setValue1(next);
    revalidate(next, value2);
  }

  function updateValue2(next: string) {
    setValue2(next);
    revalidate(value1, next);
  }

  async function submit() {
    if (!online || saving) return;

    const v1 = Number(value1);
    const v2 = kind === "bp" ? Number(value2) : undefined;
    const check = plausibility({ kind, value1: v1, ...(v2 !== undefined ? { value2: v2 } : {}) });
    if (!check.ok) {
      setError(t(stripNamespace(check.messageKey) as Parameters<typeof t>[0]));
      return;
    }
    setError(null);

    setSaving(true);
    try {
      const result = await onSave({ kind, measuredOn, value1: v1, ...(kind === "bp" ? { value2: Number(value2) } : {}) });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result);
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

      <div className="flex flex-col gap-xs">
        <label htmlFor="vital-date" className="text-body-sm text-text-secondary">
          {t("dateLabel")}
        </label>
        <input
          id="vital-date"
          type="date"
          value={measuredOn}
          onChange={(e) => setMeasuredOn(e.target.value)}
          className="min-h-[48px] rounded-sm border border-divider bg-surface px-md py-sm text-body"
        />
      </div>

      {kind === "weight" ? (
        <Input
          id="vital-weight"
          type="number"
          inputMode="decimal"
          step="0.1"
          label={t("weightLabel")}
          value={value1}
          onChange={(e) => updateValue1(e.target.value)}
        />
      ) : (
        <div className="flex gap-sm">
          <Input
            id="vital-systolic"
            type="number"
            inputMode="decimal"
            label={t("systolicLabel")}
            value={value1}
            onChange={(e) => updateValue1(e.target.value)}
            className="flex-1"
          />
          <Input
            id="vital-diastolic"
            type="number"
            inputMode="decimal"
            label={t("diastolicLabel")}
            value={value2}
            onChange={(e) => updateValue2(e.target.value)}
            className="flex-1"
          />
        </div>
      )}

      {warnKey && (
        <p role="status" className="rounded-sm bg-blush px-md py-sm text-body-sm text-text-primary">
          {t(warnKey as Parameters<typeof t>[0])}
        </p>
      )}
      {error && <p className="text-caption text-alert">{error}</p>}

      <div className="mt-sm flex gap-sm">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
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
