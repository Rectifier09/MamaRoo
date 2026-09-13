"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  createCustomQuestion,
  deleteCustomQuestion,
  toggleCustomQuestionMark,
  toggleSuggestedQuestionMark,
  updateCustomQuestion,
  type DeleteCustomQuestionResult,
  type SaveCustomQuestionResult,
  type ToggleMarkResult,
} from "@/app/actions/questions";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { APP_TIMEZONE, type Locale } from "@/lib/config";
import {
  QUESTION_BODY_MAX_LENGTH,
  validateQuestionBody,
  type QuestionBodyValidationError,
  type QuestionRecord,
} from "@/lib/domain/questions";
import { useOnline } from "@/lib/pwa/useOnline";
import { webSpeechTranscriber } from "@/lib/speech/webspeech";
import type { Transcriber } from "@/lib/speech/transcribe";

export interface NextAppointmentInfo {
  doctorName: string | null;
  clinicName: string | null;
  scheduledAt: string;
}

export interface SuggestedQuestionsProps {
  initialQuestions: QuestionRecord[];
  nextAppointment: NextAppointmentInfo | null;
  onCreate?: (input: { body: unknown }) => Promise<SaveCustomQuestionResult>;
  onUpdate?: (input: { questionId: unknown; body: unknown }) => Promise<SaveCustomQuestionResult>;
  onDelete?: (input: { questionId: unknown }) => Promise<DeleteCustomQuestionResult>;
  onToggleCustomMark?: (input: { questionId: unknown; marked: boolean }) => Promise<ToggleMarkResult>;
  onToggleSuggestedMark?: (input: { questionId: unknown; marked: boolean }) => Promise<ToggleMarkResult>;
  transcriber?: Transcriber;
}

export function SuggestedQuestions({
  initialQuestions,
  nextAppointment,
  onCreate = createCustomQuestion,
  onUpdate = updateCustomQuestion,
  onDelete = deleteCustomQuestion,
  onToggleCustomMark = toggleCustomQuestionMark,
  onToggleSuggestedMark = toggleSuggestedQuestionMark,
  transcriber = webSpeechTranscriber,
}: SuggestedQuestionsProps) {
  const t = useTranslations("questions");
  const locale = useLocale() as Locale;
  const online = useOnline();
  const { show } = useToast();
  const stopListeningRef = useRef<(() => void) | null>(null);

  const [questions, setQuestions] = useState(initialQuestions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");
  const [listening, setListening] = useState(false);
  const [pendingMarkIds, setPendingMarkIds] = useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fieldError(kind: QuestionBodyValidationError): string {
    if (kind === "empty") return t("errors.empty");
    if (kind === "too_long") return t("errors.tooLong");
    return t("errors.invalid");
  }

  function stopListening() {
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    setListening(false);
  }

  function toggleVoice() {
    if (listening) {
      stopListening();
      return;
    }
    setError(null);
    stopListeningRef.current = transcriber.start({
      locale,
      onResult: (result, isFinal) => {
        setNewText(result);
        if (isFinal) stopListening();
      },
      onError: () => {
        setError(t("errors.voice"));
        stopListening();
      },
    });
    setListening(true);
  }

  function appointmentLine(appointment: NextAppointmentInfo): string {
    const date = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      timeZone: APP_TIMEZONE,
    }).format(new Date(appointment.scheduledAt));
    const name = [appointment.doctorName, appointment.clinicName].filter(Boolean).join(", ");
    return name ? t("appointmentWith", { name, date }) : t("appointmentDateOnly", { date });
  }

  async function toggleMark(question: QuestionRecord) {
    if (pendingMarkIds.has(question.id) || !online) return;
    const next = !question.marked;
    setPendingMarkIds((prev) => new Set(prev).add(question.id));
    setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, marked: next } : q)));
    try {
      const toggle = question.kind === "custom" ? onToggleCustomMark : onToggleSuggestedMark;
      const result = await toggle({ questionId: question.id, marked: next });
      if (!result.ok) {
        setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, marked: !next } : q)));
        setError(t("errors.mark"));
      }
    } catch {
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, marked: !next } : q)));
      setError(t("errors.mark"));
    } finally {
      setPendingMarkIds((prev) => {
        const copy = new Set(prev);
        copy.delete(question.id);
        return copy;
      });
    }
  }

  function startEdit(question: QuestionRecord) {
    setError(null);
    setEditingId(question.id);
    setEditText(question.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit() {
    if (!editingId || savingEdit) return;
    const validated = validateQuestionBody(editText);
    if (!validated.ok) {
      setError(fieldError(validated.error));
      return;
    }
    if (!online) {
      setError(t("offline"));
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const result = await onUpdate({ questionId: editingId, body: validated.value });
      if (result.ok) {
        setQuestions((prev) => prev.map((q) => (q.id === result.question.id ? result.question : q)));
        cancelEdit();
      } else if ("errors" in result && result.errors.body) {
        setError(fieldError(result.errors.body));
      } else {
        setError(t("errors.save"));
      }
    } catch {
      setError(t("errors.save"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeQuestion(question: QuestionRecord) {
    setError(null);
    const removedIndex = questions.findIndex((q) => q.id === question.id);
    setQuestions((prev) => prev.filter((q) => q.id !== question.id));
    try {
      const result = await onDelete({ questionId: question.id });
      if (result.ok) {
        show(t("removedToast"));
      } else {
        setQuestions((prev) => {
          const restored = [...prev];
          restored.splice(removedIndex, 0, question);
          return restored;
        });
        setError(t("errors.remove"));
      }
    } catch {
      setError(t("errors.remove"));
    }
  }

  async function addQuestion() {
    if (adding) return;
    const validated = validateQuestionBody(newText);
    if (!validated.ok) {
      setError(fieldError(validated.error));
      return;
    }
    if (!online) {
      setError(t("offline"));
      return;
    }
    stopListening();
    setAdding(true);
    setError(null);
    try {
      const result = await onCreate({ body: validated.value });
      if (result.ok) {
        setQuestions((prev) => [...prev, result.question]);
        setNewText("");
      } else if ("errors" in result && result.errors.body) {
        setError(fieldError(result.errors.body));
      } else {
        setError(t("errors.save"));
      }
    } catch {
      setError(t("errors.save"));
    } finally {
      setAdding(false);
    }
  }

  return (
    <section
      data-testid="questions-screen"
      className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen"
      aria-labelledby="questions-title"
    >
      <header className="flex items-start gap-md">
        <Link
          href="/care"
          aria-label={t("backToCare")}
          className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <div className="min-w-0 flex-1 pt-xs">
          <h1 id="questions-title" className="font-display text-h1 font-semibold text-text-primary">
            {t("title")}
          </h1>
        </div>
      </header>

      {nextAppointment ? (
        <div className="flex items-center gap-sm rounded-[16px] bg-blush px-md py-sm">
          <span
            aria-hidden="true"
            className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent-primary text-surface-raised"
          >
            <Icon name="CalendarBlank" size="inline" />
          </span>
          <p className="text-body-sm font-semibold text-text-primary">{appointmentLine(nextAppointment)}</p>
        </div>
      ) : (
        <div className="rounded-[16px] bg-surface-raised px-md py-sm shadow-1">
          <p className="text-body-sm text-text-secondary">{t("noAppointment")}</p>
        </div>
      )}

      {questions.length === 0 ? (
        <EmptyState iconName="Question" message={t("empty")} />
      ) : (
        <ol className="flex flex-col divide-y divide-divider overflow-hidden rounded-[16px] bg-surface-raised shadow-1">
          {questions.map((question) => {
            const isEditing = editingId === question.id;
            return (
              <li key={question.id} className="flex flex-col gap-sm px-md py-sm">
                {isEditing ? (
                  <div className="flex flex-col gap-sm">
                    <label htmlFor={`question-edit-${question.id}`} className="sr-only">
                      {t("bodyLabel")}
                    </label>
                    <input
                      id={`question-edit-${question.id}`}
                      type="text"
                      value={editText}
                      maxLength={QUESTION_BODY_MAX_LENGTH}
                      autoFocus
                      onChange={(event) => setEditText(event.target.value)}
                      className="w-full rounded-sm border border-divider bg-surface px-md py-sm text-body text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-accent-primary"
                    />
                    <div className="flex justify-end gap-sm">
                      <Button type="button" variant="tertiary" onClick={cancelEdit}>
                        {t("cancel")}
                      </Button>
                      <Button type="button" variant="secondary" loading={savingEdit} onClick={() => void saveEdit()}>
                        {t("saveEdit")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-sm">
                    <button
                      type="button"
                      onClick={() => void toggleMark(question)}
                      disabled={pendingMarkIds.has(question.id)}
                      aria-pressed={question.marked}
                      aria-label={question.marked ? t("unmarkAria") : t("markAria")}
                      className={`tap-target flex size-[24px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                        question.marked ? "border-transparent bg-accent-secondary" : "border-divider bg-transparent"
                      }`}
                    >
                      {question.marked && <Icon name="Check" size="inline" className="text-surface-raised" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => question.kind === "custom" && startEdit(question)}
                      disabled={question.kind !== "custom"}
                      className={`flex-1 text-left text-body-sm font-medium ${
                        question.marked ? "text-text-secondary" : "text-text-primary"
                      }`}
                    >
                      {question.text}
                    </button>

                    {question.kind === "custom" && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(question)}
                          aria-label={t("editAria")}
                          className="tap-target flex size-[30px] shrink-0 items-center justify-center rounded-sm text-text-secondary"
                        >
                          <Icon name="PencilSimple" size="inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeQuestion(question)}
                          aria-label={t("removeAria")}
                          className="tap-target flex size-[30px] shrink-0 items-center justify-center rounded-sm text-text-secondary"
                        >
                          <Icon name="X" size="inline" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-sm rounded-full bg-surface-raised py-xs pl-lg pr-xs shadow-1">
          <label htmlFor="new-question" className="sr-only">
            {t("addPlaceholder")}
          </label>
          <input
            id="new-question"
            type="text"
            value={newText}
            maxLength={QUESTION_BODY_MAX_LENGTH}
            placeholder={t("addPlaceholder")}
            onChange={(event) => {
              setNewText(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addQuestion();
            }}
            className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-secondary/60"
          />
          {transcriber.isAvailable() && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={listening}
              aria-label={listening ? t("listening") : t("voiceButton")}
              className={`tap-target flex size-[40px] shrink-0 items-center justify-center rounded-full ${
                listening ? "bg-accent-secondary/40" : "bg-accent-secondary/20"
              }`}
            >
              <Icon name="Microphone" size="inline" className="text-accent-secondary" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void addQuestion()}
            disabled={adding}
            aria-label={t("addAria")}
            className="tap-target flex size-[38px] shrink-0 items-center justify-center rounded-full bg-accent-primary text-surface-raised shadow-1 disabled:opacity-60"
          >
            <Icon name="Plus" size="inline" />
          </button>
        </div>
        {listening && <p className="pl-lg text-caption text-accent-secondary">{t("listeningLabel")}</p>}
      </div>

      {!online && (
        <p role="status" className="text-body-sm text-text-secondary">
          {t("offline")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-alert">
          {error}
        </p>
      )}
    </section>
  );
}
