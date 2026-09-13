import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuggestedQuestions, type SuggestedQuestionsProps } from "@/app/(app)/care/questions/SuggestedQuestions";
import { ToastProvider } from "@/components/ui/ToastProvider";
import en from "@/i18n/en.json";
import type { QuestionRecord } from "@/lib/domain/questions";
import type { Transcriber } from "@/lib/speech/transcribe";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const seededQuestion: QuestionRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  text: "Is my baby's position normal right now?",
  kind: "suggested",
  marked: false,
  createdAt: null,
};

const customQuestion: QuestionRecord = {
  id: "20000000-0000-4000-8000-000000000001",
  text: "Can I continue my evening walks?",
  kind: "custom",
  marked: false,
  createdAt: "2026-09-01T00:00:00Z",
};

function transcriber(available = false): Transcriber {
  return {
    isAvailable: () => available,
    start: vi.fn(() => vi.fn()),
  };
}

function renderScreen(overrides: Partial<SuggestedQuestionsProps> = {}) {
  const props: SuggestedQuestionsProps = {
    initialQuestions: [seededQuestion, customQuestion],
    nextAppointment: null,
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onToggleCustomMark: vi.fn(),
    onToggleSuggestedMark: vi.fn(),
    transcriber: transcriber(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <SuggestedQuestions {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

describe("SuggestedQuestions", () => {
  it("lists both seeded and custom questions", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: en.questions.title })).toBeInTheDocument();
    expect(screen.getByText(seededQuestion.text)).toBeInTheDocument();
    expect(screen.getByText(customQuestion.text)).toBeInTheDocument();
  });

  it("shows the linked appointment when one exists", () => {
    renderScreen({
      nextAppointment: { doctorName: "Dr Rao", clinicName: "Sunrise Clinic", scheduledAt: "2026-10-01T09:00:00Z" },
    });
    expect(screen.getByText("For my visit with Dr Rao, Sunrise Clinic, on 1 October")).toBeInTheDocument();
  });

  it("shows the no-appointment prompt when none is linked", () => {
    renderScreen({ nextAppointment: null });
    expect(screen.getByText(en.questions.noAppointment)).toBeInTheDocument();
  });

  it("shows the empty state when neither seeded nor custom questions exist", () => {
    renderScreen({ initialQuestions: [] });
    expect(screen.getByText(en.questions.empty)).toBeInTheDocument();
  });

  it("does not offer edit or remove controls on a seeded question", () => {
    renderScreen({ initialQuestions: [seededQuestion] });
    expect(screen.queryByRole("button", { name: en.questions.editAria })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.questions.removeAria })).not.toBeInTheDocument();
  });

  it("offers edit and remove controls on a custom question", () => {
    renderScreen({ initialQuestions: [customQuestion] });
    expect(screen.getByRole("button", { name: en.questions.editAria })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.questions.removeAria })).toBeInTheDocument();
  });

  it("marks a seeded question via the suggested-mark action", async () => {
    const onToggleSuggestedMark = vi.fn().mockResolvedValue({ ok: true, marked: true });
    renderScreen({ initialQuestions: [seededQuestion], onToggleSuggestedMark });

    await userEvent.click(screen.getByRole("button", { name: en.questions.markAria }));

    expect(onToggleSuggestedMark).toHaveBeenCalledWith({ questionId: seededQuestion.id, marked: true });
  });

  it("marks a custom question via the custom-mark action", async () => {
    const onToggleCustomMark = vi.fn().mockResolvedValue({ ok: true, marked: true });
    renderScreen({ initialQuestions: [customQuestion], onToggleCustomMark });

    await userEvent.click(screen.getByRole("button", { name: en.questions.markAria }));

    expect(onToggleCustomMark).toHaveBeenCalledWith({ questionId: customQuestion.id, marked: true });
  });

  it("edits a custom question's text in place", async () => {
    const updated: QuestionRecord = { ...customQuestion, text: "Can I keep travelling?" };
    const onUpdate = vi.fn().mockResolvedValue({ ok: true, question: updated });
    renderScreen({ initialQuestions: [customQuestion], onUpdate });

    await userEvent.click(screen.getByRole("button", { name: en.questions.editAria }));
    const input = screen.getByRole("textbox", { name: en.questions.bodyLabel });
    await userEvent.clear(input);
    await userEvent.type(input, "Can I keep travelling?");
    await userEvent.click(screen.getByRole("button", { name: en.questions.saveEdit }));

    expect(onUpdate).toHaveBeenCalledWith({ questionId: customQuestion.id, body: "Can I keep travelling?" });
    expect(await screen.findByText("Can I keep travelling?")).toBeInTheDocument();
  });

  it("removes a custom question and shows the removed toast", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true });
    renderScreen({ initialQuestions: [customQuestion], onDelete });

    await userEvent.click(screen.getByRole("button", { name: en.questions.removeAria }));

    expect(onDelete).toHaveBeenCalledWith({ questionId: customQuestion.id });
    expect(screen.queryByText(customQuestion.text)).not.toBeInTheDocument();
    expect(await screen.findByText(en.questions.removedToast)).toBeInTheDocument();
  });

  it("adds her own question through the composer row", async () => {
    const created: QuestionRecord = {
      id: "20000000-0000-4000-8000-000000000002",
      text: "What should I watch for?",
      kind: "custom",
      marked: false,
      createdAt: "2026-09-13T10:00:00Z",
    };
    const onCreate = vi.fn().mockResolvedValue({ ok: true, question: created });
    renderScreen({ initialQuestions: [], onCreate });

    const input = screen.getByRole("textbox", { name: en.questions.addPlaceholder });
    await userEvent.type(input, "  What should I watch for?  ");
    await userEvent.click(screen.getByRole("button", { name: en.questions.addAria }));

    expect(onCreate).toHaveBeenCalledWith({ body: "What should I watch for?" });
    expect(await screen.findByText("What should I watch for?")).toBeInTheDocument();
  });

  it("shows a field error instead of submitting a blank question", async () => {
    const onCreate = vi.fn();
    renderScreen({ initialQuestions: [], onCreate });

    await userEvent.click(screen.getByRole("button", { name: en.questions.addAria }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByText(en.questions.errors.empty)).toBeInTheDocument();
  });
});
