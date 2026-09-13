import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotesScreen, type NotesScreenProps } from "@/app/(app)/care/notes/NotesScreen";
import { ToastProvider } from "@/components/ui/ToastProvider";
import en from "@/i18n/en.json";
import type { Transcriber } from "@/lib/speech/transcribe";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const notes = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    body: "Felt the first proper kick today,\nsuch a special moment.",
    createdAt: "2026-09-12T10:00:00Z",
    updatedAt: "2026-09-12T10:00:00Z",
  },
];

function transcriber(available = false): Transcriber {
  return {
    isAvailable: () => available,
    start: vi.fn(() => vi.fn()),
  };
}

function renderScreen(overrides: Partial<NotesScreenProps> = {}) {
  const props: NotesScreenProps = {
    initialNotes: notes,
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    transcriber: transcriber(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <NotesScreen {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

describe("NotesScreen", () => {
  it("lists each note with a single-line preview and a localized date", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: en.notes.title })).toBeInTheDocument();
    expect(screen.getByText("Felt the first proper kick today, such a special moment.")).toBeInTheDocument();
    expect(screen.getByText("12 September")).toBeInTheDocument();
  });

  it("creates a trimmed note and returns to the updated list", async () => {
    const created = {
      id: "10000000-0000-4000-8000-000000000002",
      body: "Names we both liked from the list",
      createdAt: "2026-09-13T10:00:00Z",
      updatedAt: "2026-09-13T10:00:00Z",
    };
    const onCreate = vi.fn().mockResolvedValue({ ok: true, note: created });
    renderScreen({ initialNotes: [], onCreate });

    await userEvent.click(screen.getByRole("button", { name: en.notes.addNote }));
    const editor = screen.getByRole("textbox", { name: en.notes.bodyLabel });
    await userEvent.type(editor, "  Names we both liked from the list  ");
    await userEvent.click(screen.getByRole("button", { name: en.notes.save }));

    expect(onCreate).toHaveBeenCalledWith({ body: "Names we both liked from the list" });
    expect(await screen.findByText("Names we both liked from the list")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("reads the full body and edits the same note with a prefilled composer", async () => {
    const onUpdate = vi.fn().mockResolvedValue({
      ok: true,
      note: { ...notes[0]!, body: "Updated thought." },
    });
    renderScreen({ onUpdate });

    await userEvent.click(screen.getByText("Felt the first proper kick today, such a special moment."));
    expect(screen.getByTestId("note-body-read")).toHaveTextContent(notes[0]!.body.replace("\n", " "));
    await userEvent.click(screen.getByRole("button", { name: en.notes.edit }));

    const editor = screen.getByRole("textbox", { name: en.notes.bodyLabel });
    expect(editor).toHaveValue(notes[0]!.body);
    await userEvent.clear(editor);
    await userEvent.type(editor, "Updated thought.");
    await userEvent.click(screen.getByRole("button", { name: en.notes.saveChanges }));

    expect(onUpdate).toHaveBeenCalledWith({ noteId: notes[0]!.id, body: "Updated thought." });
    expect(await screen.findByText("Updated thought.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("deletes a note after confirming, and returns to the list", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true });
    renderScreen({ onDelete });

    await userEvent.click(screen.getByText("Felt the first proper kick today, such a special moment."));
    await userEvent.click(screen.getByRole("button", { name: en.notes.delete }));
    expect(screen.getByText(en.notes.deleteConfirmBody)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: en.notes.deleteConfirm }));

    expect(onDelete).toHaveBeenCalledWith({ noteId: notes[0]!.id });
    expect(await screen.findByText(en.notes.empty)).toBeInTheDocument();
  });

  it("keeps the note when delete is cancelled", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true });
    renderScreen({ onDelete });

    await userEvent.click(screen.getByText("Felt the first proper kick today, such a special moment."));
    await userEvent.click(screen.getByRole("button", { name: en.notes.delete }));
    await userEvent.click(screen.getByRole("button", { name: en.notes.deleteCancel }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId("note-body-read")).toBeInTheDocument();
  });

  it("shows a gentle empty state when no notes exist", () => {
    renderScreen({ initialNotes: [] });
    expect(screen.getByText(en.notes.empty)).toBeInTheDocument();
    expect(screen.getByTestId("texture-motif")).toBeInTheDocument();
  });

  it("shows field errors instead of throwing", async () => {
    const onCreate = vi.fn().mockResolvedValue({ ok: false, errors: { body: "too_long" } });
    renderScreen({ initialNotes: [], onCreate });
    await userEvent.click(screen.getByRole("button", { name: en.notes.addNote }));
    await userEvent.type(screen.getByRole("textbox", { name: en.notes.bodyLabel }), "Hello");
    await userEvent.click(screen.getByRole("button", { name: en.notes.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.notes.errors.tooLong);
  });

  it("shows the voice control only when transcription is available, and fills the draft on a final result", async () => {
    const available = transcriber(true);
    renderScreen({ initialNotes: [], transcriber: available });

    await userEvent.click(screen.getByRole("button", { name: en.notes.addNote }));
    const voiceButton = screen.getByRole("button", { name: en.notes.voiceButton });
    await userEvent.click(voiceButton);

    expect(available.start).toHaveBeenCalledTimes(1);
    const { onResult } = (available.start as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    act(() => onResult("Spoken thought", true));

    expect(screen.getByRole("textbox", { name: en.notes.bodyLabel })).toHaveValue("Spoken thought");
  });
});
