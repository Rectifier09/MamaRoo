import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VitalsScreen } from "@/app/(app)/care/vitals/VitalsScreen";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

beforeEach(() => {
  useOnline.mockReset().mockReturnValue(true);
  track.mockReset();
});

function vital(overrides: Partial<{ id: string; kind: "weight" | "bp"; measured_on: string; value_1: number; value_2: number | null }> = {}) {
  return { id: "v1", kind: "weight" as const, measured_on: "2026-09-10", value_1: 62, value_2: null, notes: null, ...overrides };
}

function renderScreen(overrides: Partial<React.ComponentProps<typeof VitalsScreen>> = {}) {
  const onAdd = vi.fn().mockResolvedValue({ ok: true, vital: vital({ id: "v2", measured_on: "2026-09-14", value_1: 63 }) });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <VitalsScreen vitals={[]} onAdd={onAdd as any} {...overrides} />
    </NextIntlClientProvider>,
  );
  return { onAdd };
}

describe("VitalsScreen", () => {
  it("defaults to the weight tab", () => {
    renderScreen();
    expect(screen.getByRole("tab", { name: en.vitals.tabWeight })).toHaveAttribute("aria-selected", "true");
  });

  it("switches to the blood-pressure tab and shows its own empty chart message", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("tab", { name: en.vitals.tabBp }));
    expect(screen.getByRole("tab", { name: en.vitals.tabBp })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(en.vitals.chart.emptyBp)).toBeInTheDocument();
  });

  it("lists existing readings for the active tab, most recent first", () => {
    renderScreen({
      vitals: [vital({ id: "v1", measured_on: "2026-09-01", value_1: 60 }), vital({ id: "v2", measured_on: "2026-09-10", value_1: 62 })],
    });
    const rows = screen.getAllByText(/kg$/);
    expect(rows[0]).toHaveTextContent("62");
    expect(rows[1]).toHaveTextContent("60");
  });

  it("opens the add sheet scoped to the active tab, saves, and emits vital_logged with the kind only", async () => {
    const { onAdd } = renderScreen();
    fireEvent.click(screen.getByText(en.vitals.addReading));
    expect(await screen.findByRole("heading", { name: en.vitals.addSheetTitle })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(en.vitals.weightLabel), { target: { value: "63" } });
    fireEvent.click(screen.getByText(en.vitals.saveButton));

    await screen.findByText(en.vitals.addReading); // sheet closed, back on the screen
    expect(onAdd).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(EVENTS.vital_logged, { kind: "weight" });
  });

  it("shows the disclaimer banner", () => {
    renderScreen();
    expect(screen.getByText(en.disclaimer.userEntered)).toBeInTheDocument();
  });
});
