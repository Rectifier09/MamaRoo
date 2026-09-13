import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { AdherenceGrid } from "@/app/(app)/care/medicines/AdherenceGrid";
import type { AdherenceCell } from "@/lib/domain/adherence";

function renderGrid(cells: AdherenceCell[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdherenceGrid cells={cells} />
    </NextIntlClientProvider>,
  );
}

const cell = (overrides: Partial<AdherenceCell>): AdherenceCell => ({
  date: "2026-09-08",
  expected: 0,
  taken: 0,
  skipped: 0,
  unlogged: 0,
  ...overrides,
});

describe("AdherenceGrid", () => {
  it("renders one cell per day", () => {
    const cells = [cell({ date: "2026-09-07" }), cell({ date: "2026-09-08" }), cell({ date: "2026-09-09" })];
    renderGrid(cells);
    expect(screen.getAllByTestId("adherence-cell")).toHaveLength(3);
  });

  it("distinguishes a fully taken day by a state attribute, not colour alone", () => {
    renderGrid([cell({ date: "2026-09-08", expected: 2, taken: 2 })]);
    expect(screen.getByTestId("adherence-cell")).toHaveAttribute("data-state", "complete");
  });

  it("distinguishes a partly taken day", () => {
    renderGrid([cell({ date: "2026-09-08", expected: 2, taken: 1, unlogged: 1 })]);
    expect(screen.getByTestId("adherence-cell")).toHaveAttribute("data-state", "partial");
  });

  it("distinguishes an entirely skipped day", () => {
    renderGrid([cell({ date: "2026-09-08", expected: 2, skipped: 2 })]);
    expect(screen.getByTestId("adherence-cell")).toHaveAttribute("data-state", "skipped");
  });

  it("distinguishes an unlogged day", () => {
    renderGrid([cell({ date: "2026-09-08", expected: 2, unlogged: 2 })]);
    expect(screen.getByTestId("adherence-cell")).toHaveAttribute("data-state", "unlogged");
  });

  it("distinguishes a day with nothing expected", () => {
    renderGrid([cell({ date: "2026-09-08" })]);
    expect(screen.getByTestId("adherence-cell")).toHaveAttribute("data-state", "none");
  });

  it("gives each cell an accessible label naming the date and the state", () => {
    renderGrid([cell({ date: "2026-09-08", expected: 2, taken: 2 })]);
    const cellEl = screen.getByTestId("adherence-cell");
    expect(cellEl).toHaveAccessibleName(/2026-09-08/);
    expect(cellEl).toHaveAccessibleName(/taken/i);
  });

  it("uses gentle language for an unlogged day, never a failure word", () => {
    renderGrid([cell({ date: "2026-09-08", expected: 2, unlogged: 2 })]);
    const label = screen.getByTestId("adherence-cell").getAttribute("aria-label") ?? "";
    expect(label.toLowerCase()).not.toMatch(/fail|miss/);
  });

  it("gives the grid an overall text summary for screen readers", () => {
    renderGrid([
      cell({ date: "2026-09-08", expected: 2, taken: 2 }),
      cell({ date: "2026-09-09", expected: 2, taken: 1, unlogged: 1 }),
    ]);
    expect(screen.getByText("3 of 4 doses taken")).toBeInTheDocument();
  });
});
