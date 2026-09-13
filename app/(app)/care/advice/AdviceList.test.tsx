import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { AdviceList } from "@/app/(app)/care/advice/AdviceList";
import en from "@/i18n/en.json";
import type { AdviceRecord } from "@/lib/domain/advice";

const items: AdviceRecord[] = [
  {
    id: "a1",
    type: "medicine",
    isReminder: true,
    updates: [{ id: "u1", body: "Continue iron and calcium tablets daily", doctorName: "Dr. Priya Sharma", createdAt: "2026-09-02T00:00:00Z" }],
  },
  {
    id: "a2",
    type: "test",
    isReminder: false,
    updates: [{ id: "u2", body: "Get a glucose tolerance test done", doctorName: null, createdAt: "2026-09-01T00:00:00Z" }],
  },
];

function renderList(overrides: Partial<React.ComponentProps<typeof AdviceList>> = {}) {
  const onEdit = vi.fn();
  const onToggleReminder = vi.fn().mockResolvedValue({ ok: true, isReminder: false });
  const onReminderToggled = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdviceList items={items} onEdit={onEdit} onToggleReminder={onToggleReminder} onReminderToggled={onReminderToggled} {...overrides} />
    </NextIntlClientProvider>,
  );
  return { onEdit, onToggleReminder, onReminderToggled };
}

describe("AdviceList", () => {
  it("shows an inviting empty state when there is no advice yet", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdviceList items={[]} onEdit={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(en.advice.empty)).toBeInTheDocument();
  });

  it("shows each thread's latest text, doctor, and confirmation status", () => {
    renderList();
    expect(screen.getByText("Continue iron and calcium tablets daily")).toBeInTheDocument();
    expect(screen.getByText("Dr. Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText(en.advice.confirmedStatus)).toBeInTheDocument();
    expect(screen.getByText(en.advice.unconfirmedStatus)).toBeInTheDocument();
    expect(screen.getByText(en.advice.unnamedDoctor)).toBeInTheDocument();
  });

  it("opens the edit sheet for the tapped thread", () => {
    const { onEdit } = renderList();
    fireEvent.click(screen.getByText("Continue iron and calcium tablets daily"));
    expect(onEdit).toHaveBeenCalledWith(items[0]);
  });

  it("toggles the reminder confirmation and reports the result back up", async () => {
    const { onToggleReminder, onReminderToggled } = renderList();
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[1]!); // the unconfirmed thread

    await waitFor(() => expect(onToggleReminder).toHaveBeenCalledWith({ adviceId: "a2", isReminder: true }));
    expect(onReminderToggled).toHaveBeenCalledWith("a2", false);
  });
});
