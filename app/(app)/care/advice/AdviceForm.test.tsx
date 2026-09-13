import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdviceForm, type AdviceFormProps } from "@/app/(app)/care/advice/AdviceForm";
import en from "@/i18n/en.json";
import type { AdviceRecord } from "@/lib/domain/advice";
import type { Transcriber } from "@/lib/speech/transcribe";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

function transcriber(available = false): Transcriber {
  return { isAvailable: () => available, start: vi.fn(() => vi.fn()) };
}

const editingAdvice: AdviceRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  type: "exercise",
  isReminder: true,
  updates: [
    { id: "u1", body: "Take short walks", doctorName: "Dr. Anjali Rao", createdAt: "2026-07-02T00:00:00Z" },
  ],
};

function renderForm(overrides: Partial<AdviceFormProps> = {}) {
  const props: AdviceFormProps = {
    advice: null,
    onCreate: vi.fn(),
    onAddUpdate: vi.fn(),
    onClose: vi.fn(),
    transcriber: transcriber(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdviceForm {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

describe("AdviceForm -- add mode", () => {
  it("defaults to the medicine type chip and lets another be chosen", async () => {
    renderForm();
    expect(screen.getByRole("button", { name: en.advice.types.medicine })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: en.advice.types.diet }));
    expect(screen.getByRole("button", { name: en.advice.types.diet })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: en.advice.types.medicine })).toHaveAttribute("aria-pressed", "false");
  });

  it("creates a thread with the chosen type, trimmed body, and doctor name", async () => {
    const created = { id: "a1", type: "diet", isReminder: false, updates: [{ id: "u1", body: "Add more leafy greens", doctorName: "Dr. Rao", createdAt: "2026-09-13T10:00:00Z" }] };
    const onCreate = vi.fn().mockResolvedValue({ ok: true, advice: created });
    const onCreated = vi.fn();
    renderForm({ onCreate, onCreated });

    await userEvent.click(screen.getByRole("button", { name: en.advice.types.diet }));
    await userEvent.type(screen.getByRole("textbox", { name: en.advice.bodyLabel }), "  Add more leafy greens  ");
    await userEvent.type(screen.getByRole("textbox", { name: en.advice.doctorLabel }), "Dr. Rao");
    await userEvent.click(screen.getByRole("button", { name: en.advice.save }));

    expect(onCreate).toHaveBeenCalledWith({ type: "diet", body: "Add more leafy greens", doctorName: "Dr. Rao" });
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it("shows a field error instead of throwing", async () => {
    const onCreate = vi.fn().mockResolvedValue({ ok: false, errors: { body: "too_long" } });
    renderForm({ onCreate });
    await userEvent.type(screen.getByRole("textbox", { name: en.advice.bodyLabel }), "Hello");
    await userEvent.click(screen.getByRole("button", { name: en.advice.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.advice.errors.tooLong);
  });
});

describe("AdviceForm -- edit mode", () => {
  it("shows past entries as read-only history and no type chips", () => {
    renderForm({ advice: editingAdvice });
    expect(screen.getByText("Take short walks")).toBeInTheDocument();
    expect(screen.getByText("Dr. Anjali Rao")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: en.advice.typeLabel })).not.toBeInTheDocument();
  });

  it("prefills the doctor field with the last entry's doctor", () => {
    renderForm({ advice: editingAdvice });
    expect(screen.getByRole("textbox", { name: en.advice.doctorLabel })).toHaveValue("Dr. Anjali Rao");
  });

  it("appends a new update without touching the existing history", async () => {
    const appendedUpdate = { id: "u2", body: "Switch to gentle stretching", doctorName: "Dr. Priya Sharma", createdAt: "2026-08-20T00:00:00Z" };
    const onAddUpdate = vi.fn().mockResolvedValue({ ok: true, update: appendedUpdate, isReminder: false });
    const onAppended = vi.fn();
    renderForm({ advice: editingAdvice, onAddUpdate, onAppended });

    await userEvent.type(screen.getByRole("textbox", { name: en.advice.bodyLabel }), "Switch to gentle stretching");
    await userEvent.clear(screen.getByRole("textbox", { name: en.advice.doctorLabel }));
    await userEvent.type(screen.getByRole("textbox", { name: en.advice.doctorLabel }), "Dr. Priya Sharma");
    await userEvent.click(screen.getByRole("button", { name: en.advice.saveUpdate }));

    expect(onAddUpdate).toHaveBeenCalledWith({
      adviceId: editingAdvice.id,
      body: "Switch to gentle stretching",
      doctorName: "Dr. Priya Sharma",
    });
    expect(onAppended).toHaveBeenCalledWith(editingAdvice.id, appendedUpdate);
  });
});

describe("AdviceForm -- voice input", () => {
  it("shows the voice control only when transcription is available, and fills the draft on a final result", async () => {
    const available = transcriber(true);
    renderForm({ transcriber: available });

    await userEvent.click(screen.getByRole("button", { name: en.advice.voiceButton }));
    expect(available.start).toHaveBeenCalledTimes(1);
    const { onResult } = (available.start as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    act(() => onResult("Spoken advice", true));

    expect(screen.getByRole("textbox", { name: en.advice.bodyLabel })).toHaveValue("Spoken advice");
  });
});
