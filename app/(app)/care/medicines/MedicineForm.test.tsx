import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MedicineForm } from "@/app/(app)/care/medicines/MedicineForm";
import en from "@/i18n/en.json";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

function renderForm(overrides: Partial<React.ComponentProps<typeof MedicineForm>> = {}) {
  const onSave = vi.fn().mockResolvedValue({ ok: true, medicine: { id: "m1", name: "Vitamin D3" } });
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MedicineForm existingActiveNames={[]} onSave={onSave} onSaved={onSaved} onCancel={onCancel} {...overrides} />
    </NextIntlClientProvider>,
  );
  return { onSave, onSaved, onCancel };
}

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

describe("MedicineForm", () => {
  it("starts with one native time input", () => {
    renderForm();
    const timeInputs = document.querySelectorAll('input[type="time"]');
    expect(timeInputs).toHaveLength(1);
  });

  it("adds a time row", () => {
    renderForm();
    fireEvent.click(screen.getByText(en.care.medicines.addTime));
    expect(document.querySelectorAll('input[type="time"]')).toHaveLength(2);
  });

  it("removes a time row", () => {
    renderForm();
    fireEvent.click(screen.getByText(en.care.medicines.addTime));
    fireEvent.click(screen.getAllByLabelText(en.care.medicines.removeTime)[0]!);
    expect(document.querySelectorAll('input[type="time"]')).toHaveLength(1);
  });

  it("shows a specific error when the name is left blank", async () => {
    const { onSave } = renderForm();
    fireEvent.click(screen.getByText(en.care.medicines.saveButton));
    expect(await screen.findByText(en.care.medicines.errors.nameRequired)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits and reports the saved medicine", async () => {
    const { onSave, onSaved } = renderForm();
    fireEvent.change(screen.getByLabelText(en.care.medicines.nameLabel), { target: { value: "Vitamin D3" } });
    fireEvent.change(document.querySelector('input[type="time"]')!, { target: { value: "09:00" } });
    fireEvent.click(screen.getByText(en.care.medicines.saveButton));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Vitamin D3", scheduleTimes: ["09:00"] })),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: "m1", name: "Vitamin D3" }));
  });

  it("accepts a Devanagari medicine name", async () => {
    const { onSave } = renderForm();
    fireEvent.change(screen.getByLabelText(en.care.medicines.nameLabel), { target: { value: "आयरन की गोली" } });
    fireEvent.change(document.querySelector('input[type="time"]')!, { target: { value: "09:00" } });
    fireEvent.click(screen.getByText(en.care.medicines.saveButton));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "आयरन की गोली" })));
  });

  it("renders the duplicate-name warning as a note, and still allows saving", async () => {
    const { onSave } = renderForm({ existingActiveNames: ["Vitamin D3"] });
    fireEvent.change(screen.getByLabelText(en.care.medicines.nameLabel), { target: { value: "Vitamin D3" } });
    fireEvent.change(document.querySelector('input[type="time"]')!, { target: { value: "09:00" } });
    expect(await screen.findByText(en.care.medicines.warnings.duplicateName)).toBeInTheDocument();
    fireEvent.click(screen.getByText(en.care.medicines.saveButton));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it("blocks submission while offline, with an explanation", () => {
    useOnline.mockReturnValue(false);
    const { onSave } = renderForm();
    expect(screen.getAllByText(en.care.medicines.offline).at(-1)).toBeInTheDocument();
    fireEvent.click(screen.getByText(en.care.medicines.saveButton));
    expect(onSave).not.toHaveBeenCalled();
  });
});
