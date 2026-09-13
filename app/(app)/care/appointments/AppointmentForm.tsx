"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  addAppointment,
  cancelAppointment,
  updateAppointment,
  type AddAppointmentResult,
  type UpdateAppointmentResult,
} from "@/app/actions/appointments";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { validateAppointment, type SplitAppointment } from "@/lib/domain/appointments";
import { useOnline } from "@/lib/pwa/useOnline";

/** `datetime-local`'s value has no timezone (e.g. "2026-09-20T11:00") -- it means
 * that wall-clock time in the app's own zone. Building the ISO string with an
 * explicit +05:30 offset (Asia/Kolkata, no DST) is what makes that unambiguous,
 * rather than letting `new Date(...)` interpret it as the server's local zone. */
function toIso(datetimeLocal: string): string {
  return datetimeLocal ? `${datetimeLocal}:00+05:30` : "";
}

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${pad(Number(get("hour")))}:${get("minute")}`;
}

export interface AppointmentFormProps {
  /** Present in edit mode; absent for a new appointment. */
  appointment?: SplitAppointment | null;
  defaultDoctorName?: string | null;
  defaultClinicName?: string | null;
  onAdd?: (input: Parameters<typeof addAppointment>[0]) => Promise<AddAppointmentResult>;
  onUpdate?: (id: string, patch: Parameters<typeof updateAppointment>[1]) => Promise<UpdateAppointmentResult>;
  onCancelAppointment?: typeof cancelAppointment;
  onSaved: (appointment: unknown) => void;
  onCancelled?: () => void;
  onClose: () => void;
}

export function AppointmentForm({
  appointment,
  defaultDoctorName,
  defaultClinicName,
  onAdd = addAppointment,
  onUpdate = updateAppointment,
  onCancelAppointment = cancelAppointment,
  onSaved,
  onCancelled,
  onClose,
}: AppointmentFormProps) {
  const t = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const online = useOnline();
  const isEdit = Boolean(appointment);

  const [doctorName, setDoctorName] = useState(appointment?.doctor_name ?? defaultDoctorName ?? "");
  const [clinicName, setClinicName] = useState(appointment?.clinic_name ?? defaultClinicName ?? "");
  const [scheduledAt, setScheduledAt] = useState(appointment ? toDatetimeLocal(appointment.scheduled_at) : "");
  const [location, setLocation] = useState(appointment?.location ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function submit() {
    if (!online || saving) return;

    const result = validateAppointment({
      doctorName,
      clinicName,
      scheduledAt: toIso(scheduledAt),
      location,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      if (isEdit && appointment) {
        const saved = await onUpdate(appointment.id, result.value);
        if (!saved.ok) {
          setErrors({ scheduledAt: saved.error });
          return;
        }
        onSaved({ ...appointment, ...result.value });
      } else {
        const saved = await onAdd(result.value);
        if (!saved.ok) {
          setErrors({ scheduledAt: saved.error });
          return;
        }
        onSaved(saved.appointment);
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmCancelAppointment() {
    if (!appointment) return;
    setConfirmCancel(false);
    const result = await onCancelAppointment(appointment.id);
    if (result.ok) onCancelled?.();
  }

  return (
    <div className="flex flex-col gap-md">
      {!online && (
        <p role="status" className="rounded-sm bg-surface px-md py-sm text-body-sm text-text-secondary">
          {t("offline")}
        </p>
      )}

      <Input
        id="appointment-doctor"
        label={t("doctorLabel")}
        placeholder={t("doctorPlaceholder")}
        value={doctorName}
        onChange={(e) => setDoctorName(e.target.value)}
      />
      <Input
        id="appointment-clinic"
        label={t("clinicLabel")}
        placeholder={t("clinicPlaceholder")}
        value={clinicName}
        onChange={(e) => setClinicName(e.target.value)}
      />

      <div className="flex flex-col gap-xs">
        <label htmlFor="appointment-datetime" className="text-body-sm text-text-secondary">
          {t("dateTimeLabel")}
        </label>
        <input
          id="appointment-datetime"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="min-h-[48px] rounded-sm border border-divider bg-surface px-md py-sm text-body"
        />
        {errors.scheduledAt && <p className="text-caption text-alert">{errors.scheduledAt}</p>}
      </div>

      <Input
        id="appointment-location"
        label={t("locationLabel")}
        placeholder={t("locationPlaceholder")}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

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

      {isEdit && (
        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          className="tap-target self-center text-caption text-text-secondary underline"
        >
          {t("cancelThisAppointment")}
        </button>
      )}

      <BottomSheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title={t("cancelConfirmTitle")}>
        <p className="text-body text-text-secondary">{t("cancelConfirmBody")}</p>
        <div className="mt-md flex gap-sm">
          <button
            type="button"
            onClick={() => setConfirmCancel(false)}
            className="tap-target flex-1 rounded-sm border border-divider px-lg py-sm text-button font-medium text-text-primary"
          >
            {t("cancelDismiss")}
          </button>
          <button
            type="button"
            onClick={() => void confirmCancelAppointment()}
            className="tap-target flex-1 rounded-sm bg-accent-primary px-lg py-sm text-button font-medium text-surface-raised"
          >
            {t("cancelConfirm")}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
