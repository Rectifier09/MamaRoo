"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addVital, type AddVitalResult } from "@/app/actions/vitals";
import { VitalForm } from "@/app/(app)/care/vitals/VitalForm";
import { track } from "@/components/AnalyticsProvider";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Tabs } from "@/components/ui/Tabs";
import { BackButton } from "@/components/patterns/BackButton";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";
import { TrendChart, type TrendChartSeriesData } from "@/components/charts/TrendChart";
import { EVENTS } from "@/lib/analytics/events";
import { vitalSeries, type VitalKind, type VitalRow } from "@/lib/domain/vitals";

export interface VitalsScreenProps {
  vitals: VitalRow[];
  onAdd?: typeof addVital;
}

export function VitalsScreen({ vitals, onAdd = addVital }: VitalsScreenProps) {
  const t = useTranslations("vitals");
  const td = useTranslations("disclaimer");
  const [items, setItems] = useState(vitals);
  const [tab, setTab] = useState<VitalKind>("weight");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { points } = vitalSeries({ vitals: items, kind: tab });
  const reversed = [...points].reverse();

  const chartSeries: TrendChartSeriesData[] =
    tab === "weight"
      ? [{ id: "weight", points: points.map((p) => ({ date: p.date, value: p.value })) }]
      : [
          { id: "systolic", points: points.map((p) => ({ date: p.date, value: p.value })) },
          {
            id: "diastolic",
            points: points.filter((p) => p.secondValue !== undefined).map((p) => ({ date: p.date, value: p.secondValue! })),
          },
        ];

  const seriesLabels =
    tab === "weight"
      ? { weight: t("chart.seriesWeight") }
      : { systolic: t("chart.seriesSystolic"), diastolic: t("chart.seriesDiastolic") };

  const ariaSummary = buildAriaSummary();
  function buildAriaSummary(): string {
    if (points.length === 0) return "";
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (tab === "weight") {
      return points.length === 1
        ? t("chart.summaryWeightSingle", { value: first.value })
        : t("chart.summaryWeight", { count: points.length, first: first.value, last: last.value });
    }
    return points.length === 1
      ? t("chart.summaryBpSingle", { systolic: first.value, diastolic: first.secondValue ?? 0 })
      : t("chart.summaryBp", {
          count: points.length,
          firstSys: first.value,
          firstDia: first.secondValue ?? 0,
          lastSys: last.value,
          lastDia: last.secondValue ?? 0,
        });
  }

  function handleSaved(result: Extract<AddVitalResult, { ok: true }>) {
    // Same loose cast as the page boundary: the action returns the generated
    // Row type (`kind: string`), narrowed here to this module's own VitalRow.
    setItems((prev) => [...prev, result.vital as unknown as VitalRow]);
    setSheetOpen(false);
    track(EVENTS.vital_logged, { kind: tab });
  }

  return (
    <div className="flex flex-col gap-lg py-screen">
      <header className="flex items-center gap-md">
        <BackButton href="/care" label={t("backLabel")} />
        <h1 className="font-display text-h1 text-text-primary">{t("title")}</h1>
      </header>

      <Tabs
        tabs={[
          { id: "weight", label: t("tabWeight") },
          { id: "bp", label: t("tabBp") },
        ]}
        activeId={tab}
        onChange={(id) => setTab(id as VitalKind)}
      />

      <TrendChart
        series={chartSeries}
        seriesLabels={seriesLabels}
        ariaSummary={ariaSummary}
        emptyMessage={tab === "weight" ? t("chart.emptyWeight") : t("chart.emptyBp")}
      />

      {reversed.length > 0 && (
        <ul className="flex flex-col">
          {reversed.map((p) => (
            <li key={p.date + p.value} className="flex items-center justify-between border-b border-divider py-sm last:border-b-0">
              <span className="text-body text-text-primary">
                {tab === "weight" ? t("list.weightRow", { value: p.value }) : t("list.bpRow", { systolic: p.value, diastolic: p.secondValue ?? 0 })}
              </span>
              <span className="text-body-sm text-text-secondary">{p.date}</span>
            </li>
          ))}
        </ul>
      )}

      <DisclaimerBanner>{td("userEntered")}</DisclaimerBanner>

      <Button type="button" onClick={() => setSheetOpen(true)}>
        {t("addReading")}
      </Button>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("addSheetTitle")}>
        {sheetOpen && <VitalForm kind={tab} onSave={onAdd} onSaved={handleSaved} onClose={() => setSheetOpen(false)} />}
      </BottomSheet>
    </div>
  );
}
