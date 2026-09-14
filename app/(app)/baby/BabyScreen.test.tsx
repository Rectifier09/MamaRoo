import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { BabyScreen, type BabyScreenProps } from "@/app/(app)/baby/BabyScreen";
import { illustrationStage } from "@/lib/domain/stages";
import en from "@/i18n/en.json";
import type { TimelineEntry } from "@/lib/domain/timeline";

const baseProps: BabyScreenProps = {
  week: 24,
  stageNumber: illustrationStage(24),
  babyCount: 1,
  stage: { lottieUrl: "/illustrations/stage-6-placeholder.json", staticSrc: "/illustrations/stage-6-placeholder.svg" },
  stageChangedToday: false,
  sensitiveMode: false,
  timelineEntries: [],
  showKicksCard: false,
  favoriteNames: [],
};

function renderScreen(overrides: Partial<BabyScreenProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <BabyScreen {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  );
}

const event = (id: string): TimelineEntry => ({
  kind: "event",
  id,
  occurredAt: new Date().toISOString(),
  title: `Logged ${id}`,
  body: null,
  eventType: "note",
});

describe("BabyScreen", () => {
  it("shows the generic name prompt when nothing is favorited yet", () => {
    renderScreen();
    expect(screen.getByText(en.baby.bento.namePrompt)).toBeInTheDocument();
  });

  it("shows favorited names in the name card instead of the generic prompt", () => {
    renderScreen({
      favoriteNames: [
        { id: "n1", name: "Aditi", meaning: "Boundless" },
        { id: "n2", name: "Tara", meaning: "Star" },
      ],
    });
    expect(screen.getByText("Aditi, Tara")).toBeInTheDocument();
    expect(screen.queryByText(en.baby.bento.namePrompt)).not.toBeInTheDocument();
  });

  it("still links the name card to /baby/name so she can favorite more", () => {
    renderScreen({ favoriteNames: [{ id: "n1", name: "Aditi", meaning: "Boundless" }] });
    expect(screen.getByRole("link", { name: new RegExp(en.baby.bento.nameTitle) })).toHaveAttribute(
      "href",
      "/baby/name",
    );
  });


  it("renders one illustration with week-specific alt text for a singleton", () => {
    renderScreen();
    const illustrations = screen.getAllByRole("img");
    expect(illustrations).toHaveLength(1);
    expect(illustrations[0]).toHaveAccessibleName(/week 24/i);
  });

  it("renders two illustrations for a twin pregnancy", () => {
    renderScreen({ babyCount: 2 });
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("shows the correct stage out of nine", () => {
    renderScreen();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", String(illustrationStage(24)));
    expect(bar).toHaveAttribute("aria-valuemax", "9");
  });

  it("does not change stage between two weeks in the same boundary", () => {
    const stageAt9 = illustrationStage(9);
    const stageAt11 = illustrationStage(11);
    expect(stageAt9).toBe(stageAt11);
    renderScreen({ week: 9, stageNumber: stageAt9 });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(stageAt9));
  });

  it("renders the timeline with her logged events", () => {
    renderScreen({ timelineEntries: [event("e1")] });
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(1);
  });

  it("shows an EmptyState when nothing is logged", () => {
    renderScreen({ timelineEntries: [] });
    expect(screen.getByTestId("texture-motif")).toBeInTheDocument();
  });

  // PCPNDT Act compliance (spec §1.4, enforced repo-wide by
  // tests/guards/schema-pcpndt.test.ts): this screen must never ask whether
  // the baby is a boy or a girl. Deliberately not spelling out the guard's
  // own forbidden vocabulary here (see tests/guards/pcpndt-terms.ts) --
  // that scanner matches this file's text verbatim, this comment included.
  it("has no field anywhere asking whether the baby is a boy or a girl", () => {
    renderScreen();
    expect(screen.queryByLabelText(/\bboy\b|\bgirl\b/i)).not.toBeInTheDocument();
  });

  it("renders no texture-motif outside of the empty timeline state", () => {
    renderScreen({ timelineEntries: [event("e1")] });
    expect(screen.queryByTestId("texture-motif")).not.toBeInTheDocument();
  });

  it("suppresses the stage-change bloom in sensitive-moment mode", () => {
    renderScreen({ stageChangedToday: true, sensitiveMode: true });
    expect(screen.getByTestId("stage-bloom")).toHaveAttribute("data-active", "false");
  });

  it("shows the bloom on a real stage-change day outside sensitive mode", () => {
    renderScreen({ stageChangedToday: true, sensitiveMode: false });
    expect(screen.getByTestId("stage-bloom")).toHaveAttribute("data-active", "true");
  });

  it("hides the kick-counter bento card before week 28", () => {
    renderScreen({ showKicksCard: false });
    expect(screen.queryByTestId("kicks-card")).not.toBeInTheDocument();
  });

  it("shows the kick-counter bento card from week 28 onward", () => {
    renderScreen({ showKicksCard: true });
    expect(screen.getByTestId("kicks-card")).toBeInTheDocument();
  });

  it("links the baby-name card to /baby/name and the letters card to /baby/letters", () => {
    renderScreen();
    expect(screen.getByText(/choose a name/i).closest("a")).toHaveAttribute("href", "/baby/name");
    expect(screen.getByText(/write your first letter/i).closest("a")).toHaveAttribute("href", "/baby/letters");
  });
});
