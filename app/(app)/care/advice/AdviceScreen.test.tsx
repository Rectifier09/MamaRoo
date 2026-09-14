import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { AdviceScreen } from "@/app/(app)/care/advice/AdviceScreen";
import en from "@/i18n/en.json";
import type { AdviceRecord } from "@/lib/domain/advice";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

vi.mock("@/app/actions/advice", () => ({
  createAdvice: vi.fn(),
  addAdviceUpdate: vi.fn(),
  toggleAdviceReminder: vi.fn().mockResolvedValue({ ok: true, isReminder: false }),
}));

import { addAdviceUpdate, createAdvice } from "@/app/actions/advice";

const existing: AdviceRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  type: "exercise",
  isReminder: true,
  updates: [{ id: "u1", body: "Take short walks", doctorName: "Dr. Anjali Rao", createdAt: "2026-07-02T00:00:00Z" }],
};

describe("AdviceScreen", () => {
  it("has a back link to Care", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdviceScreen initialAdvice={[]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: en.advice.backLabel })).toHaveAttribute("href", "/care");
  });


  it("shows the empty state and an add action when there is no advice yet", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdviceScreen initialAdvice={[]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(en.advice.empty)).toBeInTheDocument();
    expect(screen.getByText(en.advice.addAdvice)).toBeInTheDocument();
  });

  it("opens the add sheet, saves, and shows the new thread in the list", async () => {
    const created: AdviceRecord = {
      id: "a2",
      type: "diet",
      isReminder: false,
      updates: [{ id: "u2", body: "Add more leafy greens", doctorName: null, createdAt: "2026-09-13T10:00:00Z" }],
    };
    vi.mocked(createAdvice).mockResolvedValue({ ok: true, advice: created });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdviceScreen initialAdvice={[]} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByText(en.advice.addAdvice));
    expect(await screen.findByRole("heading", { name: en.advice.addSheetTitle })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: en.advice.bodyLabel }), {
      target: { value: "Add more leafy greens" },
    });
    fireEvent.click(screen.getByRole("button", { name: en.advice.save }));

    await waitFor(() => expect(createAdvice).toHaveBeenCalled());
    expect(await screen.findByText("Add more leafy greens")).toBeInTheDocument();
  });

  it("appends an update to an existing thread and clears its confirmed status", async () => {
    vi.mocked(addAdviceUpdate).mockResolvedValue({
      ok: true,
      update: { id: "u2", body: "Switch to gentle stretching", doctorName: "Dr. Priya Sharma", createdAt: "2026-08-20T00:00:00Z" },
      isReminder: false,
    });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AdviceScreen initialAdvice={[existing]} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByText("Take short walks"));
    expect(await screen.findByRole("heading", { name: en.advice.editSheetTitle })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: en.advice.bodyLabel }), {
      target: { value: "Switch to gentle stretching" },
    });
    fireEvent.click(screen.getByRole("button", { name: en.advice.saveUpdate }));

    await waitFor(() => expect(addAdviceUpdate).toHaveBeenCalled());
    expect(await screen.findByText("Switch to gentle stretching")).toBeInTheDocument();
    expect(screen.getByText(en.advice.unconfirmedStatus)).toBeInTheDocument();
  });
});
