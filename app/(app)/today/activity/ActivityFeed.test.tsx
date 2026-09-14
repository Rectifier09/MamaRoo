import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { ActivityFeed } from "@/app/(app)/today/activity/ActivityFeed";
import en from "@/i18n/en.json";
import type { ActivityGroup } from "@/lib/domain/activity";

function renderFeed(groups: ActivityGroup[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <ActivityFeed groups={groups} />
    </NextIntlClientProvider>,
  );
}

const groups: ActivityGroup[] = [
  {
    labelKey: "activity.today",
    entries: [
      { id: "m1", kind: "moodGood", occurredAt: "2026-09-11T14:00:00+05:30", params: { body: "I am scared about a private symptom" } },
      { id: "med1", kind: "medicineTaken", occurredAt: "2026-09-11T09:00:00+05:30", params: { medicineName: "iron tablet" } },
    ],
  },
  {
    labelKey: "activity.yesterday",
    entries: [
      { id: "w1", kind: "wellness", occurredAt: "2026-09-10T19:00:00+05:30", params: { label: "evening walk" } },
      { id: "m2", kind: "moodNew", occurredAt: "2026-09-10T10:30:00+05:30", params: { body: "" } },
    ],
  },
  {
    labelKey: "activity.thisWeek",
    entries: [
      { id: "mile1", kind: "milestone", occurredAt: "2026-09-08T10:00:00+05:30", params: { title: "week 24" } },
      { id: "a1", kind: "appointment", occurredAt: "2026-09-06T10:00:00+05:30", params: { title: "checkup" } },
    ],
  },
  {
    labelKey: "activity.earlier",
    entries: [
      { id: "m3", kind: "moodWorried", occurredAt: "2026-08-30T10:00:00+05:30", params: { body: "" } },
      { id: "med2", kind: "medicineSkipped", occurredAt: "2026-08-30T09:00:00+05:30", params: { medicineName: "calcium tablet" } },
    ],
  },
];

describe("ActivityFeed", () => {
  it("renders groups and entries in the supplied groupActivityByDay order", () => {
    renderFeed(groups);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual([en.activity.today, en.activity.yesterday, en.activity.thisWeek, en.activity.earlier]);
    expect(document.querySelectorAll("[data-activity-kind]")[0]).toHaveAttribute("data-activity-kind", "moodGood");
  });

  it("renders translated text and the matching icon branch for every kind", () => {
    renderFeed(groups);
    const expected = [
      ["moodGood", "mood-good", en.activity.moodGood],
      ["medicineTaken", "medicine", "Took your iron tablet"],
      ["wellness", "wellness", "Went for your evening walk"],
      ["moodNew", "mood-new", en.activity.moodNew],
      ["milestone", "milestone", "Reached week 24"],
      ["appointment", "appointment", "Added a question for your checkup"],
      ["moodWorried", "mood-worried", en.activity.moodWorried],
      ["medicineSkipped", "medicine", "Skipped your calcium tablet"],
    ] as const;

    expected.forEach(([kind, family, text]) => {
      const row = document.querySelector(`[data-activity-kind="${kind}"]`);
      expect(row).not.toBeNull();
      expect(within(row as HTMLElement).getByText(text)).toBeInTheDocument();
      expect(within(row as HTMLElement).getByTestId("icon").parentElement).toHaveAttribute("data-icon-family", family);
    });
  });

  it("uses fixed mood copy in the row itself, never the raw text, until tapped", () => {
    renderFeed(groups);
    expect(screen.getByText(en.activity.moodGood)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("I am scared about a private symptom");
  });

  // Session 33 follow-up: the row stays generic (previous test) -- tapping
  // it is what reveals what she actually typed, in a detail view rather than
  // in the scannable list itself.
  it("reveals the typed text in a detail view when a mood row with notes is tapped", () => {
    renderFeed(groups);
    fireEvent.click(screen.getByText(en.activity.moodGood).closest("button")!);
    expect(screen.getByText("I am scared about a private symptom")).toBeInTheDocument();
  });

  it("shows a no-notes fallback when a mood row without notes is tapped", () => {
    renderFeed(groups);
    fireEvent.click(screen.getByText(en.activity.moodNew).closest("button")!);
    expect(screen.getByText(en.activity.detailNoNotes)).toBeInTheDocument();
  });

  it("does not make non-mood rows clickable -- there is nothing extra to reveal", () => {
    renderFeed(groups);
    const medicineRow = document.querySelector('[data-activity-kind="medicineTaken"]');
    expect(within(medicineRow as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows connectors except after the last entry in each group", () => {
    renderFeed(groups);
    expect(screen.getAllByTestId("activity-connector")).toHaveLength(4);
    document.querySelectorAll("ol").forEach((list) => {
      const rows = within(list).getAllByRole("listitem");
      expect(within(rows.at(-1) as HTMLElement).queryByTestId("activity-connector")).not.toBeInTheDocument();
    });
  });

  it("renders EmptyState instead of an empty card", () => {
    renderFeed([]);
    expect(screen.getByText(en.activity.empty)).toBeInTheDocument();
    expect(screen.getByTestId("texture-motif")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-activity-kind]")).toHaveLength(0);
  });

  it("links back to Today", () => {
    renderFeed(groups);
    expect(screen.getByRole("link", { name: en.today.backToToday })).toHaveAttribute("href", "/today");
  });
});
