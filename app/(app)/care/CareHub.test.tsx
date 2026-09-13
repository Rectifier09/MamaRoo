import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { CareHub, type CareHubProps } from "@/app/(app)/care/CareHub";
import en from "@/i18n/en.json";

function renderHub(overrides: Partial<CareHubProps> = {}) {
  const props: CareHubProps = {
    medicineText: null,
    appointmentText: null,
    reportText: null,
    adviceText: null,
    questionsCount: 0,
    notesText: null,
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CareHub {...props} />
    </NextIntlClientProvider>,
  );
}

describe("CareHub", () => {
  it("shows an inviting prompt for every empty section", () => {
    renderHub();
    expect(screen.getByText(en.care.hub.medicinePrompt)).toBeInTheDocument();
    expect(screen.getByText(en.care.hub.appointmentPrompt)).toBeInTheDocument();
    expect(screen.getByText(en.care.hub.reportPrompt)).toBeInTheDocument();
    expect(screen.getByText(en.care.hub.advicePrompt)).toBeInTheDocument();
    expect(screen.getByText(en.care.hub.questionsPrompt)).toBeInTheDocument();
    expect(screen.getByText(en.care.hub.notesPrompt)).toBeInTheDocument();
  });

  it("shows real content once a section has some", () => {
    renderHub({ medicineText: "Folic acid, today at 9:00 PM" });
    expect(screen.getByText("Folic acid, today at 9:00 PM")).toBeInTheDocument();
  });

  it("shows the latest note's preview once one exists", () => {
    renderHub({ notesText: "Felt the first kick today" });
    expect(screen.getByText("Felt the first kick today")).toBeInTheDocument();
  });

  it("shows a pluralised count of ready questions", () => {
    renderHub({ questionsCount: 3 });
    expect(screen.getByText("3 questions ready for your next visit")).toBeInTheDocument();
  });

  it("links every card to its fixed sub-screen route, even before that screen exists", () => {
    renderHub();
    expect(screen.getByRole("link", { name: new RegExp(en.care.hub.medicineLabel) })).toHaveAttribute(
      "href",
      "/care/medicines",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.care.hub.appointmentLabel) })).toHaveAttribute(
      "href",
      "/care/appointments",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.care.hub.reportLabel) })).toHaveAttribute(
      "href",
      "/care/reports",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.care.hub.adviceLabel) })).toHaveAttribute(
      "href",
      "/care/advice",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.care.hub.questionsLabel) })).toHaveAttribute(
      "href",
      "/care/questions",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.care.hub.summaryTitle) })).toHaveAttribute(
      "href",
      "/care/summary",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.care.hub.notesLabel) })).toHaveAttribute(
      "href",
      "/care/notes",
    );
  });
});
