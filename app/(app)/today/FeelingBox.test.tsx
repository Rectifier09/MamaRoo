import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { FeelingBox, type FeelingBoxProps } from "@/app/(app)/today/FeelingBox";
import { EVENTS } from "@/lib/analytics/events";
import type { Transcriber } from "@/lib/speech/transcribe";

const track = vi.fn();
const useOnline = vi.fn(() => true);

vi.mock("@/components/AnalyticsProvider", () => ({
  track: (...args: unknown[]) => track(...args),
}));
vi.mock("@/lib/pwa/useOnline", () => ({
  useOnline: () => useOnline(),
}));

function transcriber(available = false): Transcriber {
  return {
    isAvailable: () => available,
    start: vi.fn(() => vi.fn()),
  };
}

function renderBox({
  onSubmit = vi.fn<FeelingBoxProps["onSubmit"]>().mockResolvedValue(undefined),
  voice = transcriber(),
}: {
  onSubmit?: FeelingBoxProps["onSubmit"];
  voice?: Transcriber;
} = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FeelingBox onSubmit={onSubmit} transcriber={voice} />
    </NextIntlClientProvider>,
  );
  return { onSubmit };
}

beforeEach(() => {
  track.mockReset();
  useOnline.mockReset().mockReturnValue(true);
});

describe("FeelingBox", () => {
  it("renders the three exact feeling chips with none selected", () => {
    renderBox();

    for (const label of ["I'm feeling good", "Something's new", "I'm feeling worried"]) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("toggles a chip without submitting", async () => {
    const { onSubmit } = renderBox();
    const chip = screen.getByRole("button", { name: "I'm feeling good" });

    await userEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed text with the feeling tapped most recently", async () => {
    const { onSubmit } = renderBox();
    await userEvent.click(screen.getByRole("button", { name: "I'm feeling good" }));
    await userEvent.click(screen.getByRole("button", { name: "I'm feeling worried" }));
    await userEvent.type(screen.getByRole("textbox"), "  A little tired today  ");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith({
      text: "A little tired today",
      feeling: "worried",
      inputMethod: "text",
    });
  });

  it("submits null when no feeling was selected", async () => {
    const { onSubmit } = renderBox();
    await userEvent.type(screen.getByRole("textbox"), "Feeling steady");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith({
      text: "Feeling steady",
      feeling: null,
      inputMethod: "text",
    });
  });

  it("refuses whitespace text even when a chip is selected", async () => {
    const { onSubmit } = renderBox();
    await userEvent.click(screen.getByRole("button", { name: "Something's new" }));
    await userEvent.type(screen.getByRole("textbox"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Add a few words before you send this.");
  });

  it("shows the voice control only when transcription is available", () => {
    const { unmount } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <FeelingBox
          onSubmit={vi.fn<FeelingBoxProps["onSubmit"]>().mockResolvedValue(undefined)}
          transcriber={transcriber(false)}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Add detail by voice" })).not.toBeInTheDocument();

    unmount();
    renderBox({ voice: transcriber(true) });
    expect(screen.getByRole("button", { name: "Add detail by voice" })).toBeInTheDocument();
  });

  it("disables submission while offline and explains why", () => {
    useOnline.mockReturnValue(false);
    renderBox();

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're offline right now. This will send once you're back.",
    );
  });

  it("tracks only a length bucket, input method, and nullable feeling", async () => {
    renderBox();
    await userEvent.click(screen.getByRole("button", { name: "I'm feeling good" }));
    await userEvent.type(screen.getByRole("textbox"), "Private symptom text");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(track).toHaveBeenCalledWith(EVENTS.checkin_submitted, {
      input_method: "text",
      length_bucket: "short",
      feeling: "good",
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain("Private symptom text");
  });
});
