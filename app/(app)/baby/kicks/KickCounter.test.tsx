import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { KickCounter, type KickCounterProps } from "@/app/(app)/baby/kicks/KickCounter";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

vi.mock("@/components/AnalyticsProvider", () => ({ track: vi.fn() }));
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => mockOnline }));

let mockOnline = true;

const baseProps: KickCounterProps = {
  session: { id: "s1", startedAt: new Date().toISOString(), targetCount: 10, taps: [], isNew: true },
  week: 30,
  onRecordKick: vi.fn().mockResolvedValue({ ok: true }),
  onFinish: vi.fn().mockResolvedValue({ ok: true, count: 10 }),
};

function renderCounter(overrides: Partial<KickCounterProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <KickCounter {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockOnline = true;
  vi.clearAllMocks();
});

describe("KickCounter", () => {
  it("renders a single large tap target with an accessible name and the tap-target class", () => {
    renderCounter();
    const button = screen.getByTestId("kick-tap-target");
    expect(button).toHaveAccessibleName();
    expect(button.className).toContain("tap-target");
  });

  it("increments the visible count on tap", async () => {
    renderCounter();
    const button = screen.getByTestId("kick-tap-target");
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("resumes an open session with its existing count rather than restarting", () => {
    renderCounter({
      session: {
        id: "s1",
        startedAt: new Date().toISOString(),
        targetCount: 10,
        taps: [{ tapId: "a", occurredAt: new Date().toISOString() }],
        isNew: false,
      },
    });
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("presents a session older than twelve hours as closed rather than resumed", () => {
    renderCounter({
      session: {
        id: "s1",
        startedAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
        targetCount: 10,
        taps: [],
        isNew: false,
      },
    });
    expect(screen.queryByTestId("kick-tap-target")).not.toBeInTheDocument();
  });

  it("shows the completion state and a finish action once the target is reached", async () => {
    const taps = Array.from({ length: 10 }, (_, i) => ({ tapId: `t${i}`, occurredAt: new Date().toISOString() }));
    renderCounter({ session: { ...baseProps.session, taps } });
    expect(await screen.findByRole("button", { name: /finish/i })).toBeInTheDocument();
  });

  it("calls the finish action once even on a double tap", async () => {
    const onFinish = vi.fn().mockResolvedValue({ ok: true, count: 10 });
    const taps = Array.from({ length: 10 }, (_, i) => ({ tapId: `t${i}`, occurredAt: new Date().toISOString() }));
    renderCounter({ session: { ...baseProps.session, taps }, onFinish });
    const finishButton = await screen.findByRole("button", { name: /finish/i });
    fireEvent.click(finishButton);
    fireEvent.click(finishButton);
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  });

  it("refuses a tap while offline and reports offline_write_blocked for the kick feature", async () => {
    const { track } = await import("@/components/AnalyticsProvider");
    mockOnline = false;
    const onRecordKick = vi.fn().mockResolvedValue({ ok: true });
    renderCounter({ onRecordKick });
    const button = screen.getByTestId("kick-tap-target");
    fireEvent.click(button);
    expect(onRecordKick).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(EVENTS.offline_write_blocked, { feature: "kick" });
  });

  it("rolls a tap back and shows an error if the record action fails", async () => {
    const onRecordKick = vi.fn().mockResolvedValue({ ok: false, error: "boom" });
    renderCounter({ onRecordKick });
    fireEvent.click(screen.getByTestId("kick-tap-target"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
