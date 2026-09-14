import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VitalForm } from "@/app/(app)/care/vitals/VitalForm";
import en from "@/i18n/en.json";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

function renderForm(overrides: Partial<React.ComponentProps<typeof VitalForm>> = {}) {
  const onSave = vi.fn().mockResolvedValue({ ok: true, vital: { id: "v1", kind: overrides.kind ?? "weight" } });
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <VitalForm kind="weight" onSave={onSave} onSaved={onSaved} onClose={onClose} {...overrides} />
    </NextIntlClientProvider>,
  );
  return { onSave, onSaved, onClose };
}

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

describe("VitalForm", () => {
  it("shows one native decimal number input for a weight reading", () => {
    renderForm({ kind: "weight" });
    const inputs = document.querySelectorAll('input[type="number"]');
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toHaveAttribute("inputMode", "decimal");
  });

  it("shows two native decimal number inputs for a blood-pressure reading", () => {
    renderForm({ kind: "bp" });
    expect(document.querySelectorAll('input[type="number"]')).toHaveLength(2);
  });

  it("shows a specific error and does not save when the weight is out of range", async () => {
    const { onSave } = renderForm({ kind: "weight" });
    fireEvent.change(screen.getByLabelText(en.vitals.weightLabel), { target: { value: "900" } });
    fireEvent.click(screen.getByText(en.vitals.saveButton));
    expect(await screen.findByText(en.vitals.errors.weightRange)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows a note but still allows saving a clinically notable blood-pressure reading", async () => {
    const { onSave, onSaved } = renderForm({ kind: "bp" });
    fireEvent.change(screen.getByLabelText(en.vitals.systolicLabel), { target: { value: "165" } });
    fireEvent.change(screen.getByLabelText(en.vitals.diastolicLabel), { target: { value: "105" } });
    expect(await screen.findByText(en.vitals.notes.bpNotable)).toBeInTheDocument();

    fireEvent.click(screen.getByText(en.vitals.saveButton));
    await screen.findByText(en.vitals.notes.bpNotable); // still present, not treated as blocking

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ kind: "bp", value1: 165, value2: 105 }));
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows the offline explanation and refuses to save while offline", async () => {
    useOnline.mockReturnValue(false);
    const { onSave } = renderForm({ kind: "weight" });
    expect(screen.getAllByText(en.vitals.offline).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(en.vitals.weightLabel), { target: { value: "62" } });
    fireEvent.click(screen.getByText(en.vitals.saveButton));
    expect(onSave).not.toHaveBeenCalled();
  });
});
