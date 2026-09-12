import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import {
  TodayEdgeState,
  type TodayEdgeStateKind,
} from "@/app/(app)/today/TodayEdgeState";
import { PRODUCT_NAME } from "@/lib/config";

vi.mock("@/components/patterns/IllustrationContainer", () => ({
  IllustrationContainer: ({ lottieUrl, staticSrc, alt }: { lottieUrl: string; staticSrc: string; alt: string }) => (
    <img data-testid="edge-illustration" data-lottie-url={lottieUrl} src={staticSrc} alt={alt} />
  ),
}));

const stage = {
  lottieUrl: "/illustrations/stages/week-20.json",
  staticSrc: "/illustrations/stages/week-20.svg",
};

const EXPECTED: Record<
  TodayEdgeStateKind,
  { headline: string; supporting?: string; primary: string; secondary?: string; motif: string | null }
> = {
  offline: {
    headline: "You're offline right now",
    supporting: "Today's plan is still here. We'll catch up once you're back online.",
    primary: "Continue",
    motif: "cloud",
  },
  missed_task: {
    headline: "Looks like you missed this one",
    primary: "Do it now",
    secondary: "Ask your doctor about it instead",
    motif: "pill",
  },
  returning: {
    headline: `Your ${PRODUCT_NAME} journey is ready whenever you need it`,
    primary: "See today",
    motif: null,
  },
  overdue: {
    headline: "Still on your way, little one",
    supporting: "Every pregnancy has its own timing. Your care team will guide you from here.",
    primary: "Continue",
    motif: null,
  },
  save_failed: {
    headline: "That didn't save, want to try again?",
    primary: "Try again",
    secondary: "Do it later",
    motif: "retry",
  },
  pending_reminder: {
    headline: "This is still waiting for you",
    primary: "Take it now",
    motif: "calendar",
  },
};

function renderState(state: TodayEdgeStateKind) {
  const onPrimary = vi.fn();
  const onSecondary = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TodayEdgeState
        state={state}
        stage={stage}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
      />
    </NextIntlClientProvider>,
  );
  return { onPrimary, onSecondary };
}

describe("TodayEdgeState", () => {
  for (const state of Object.keys(EXPECTED) as TodayEdgeStateKind[]) {
    it(`renders the correct ${state} copy and actions`, async () => {
      const expected = EXPECTED[state];
      const { onPrimary, onSecondary } = renderState(state);

      expect(screen.getByRole("heading", { name: expected.headline })).toBeInTheDocument();
      if (expected.supporting) expect(screen.getByText(expected.supporting)).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: expected.primary }));
      expect(onPrimary).toHaveBeenCalledOnce();

      if (expected.secondary) {
        await userEvent.click(screen.getByRole("button", { name: expected.secondary }));
        expect(onSecondary).toHaveBeenCalledOnce();
      } else {
        expect(onSecondary).not.toHaveBeenCalled();
      }
    });

    it(`renders the correct ${state} illustration treatment`, () => {
      const expected = EXPECTED[state];
      renderState(state);

      const shell = screen.getByTestId("edge-illustration-shell");
      expect(shell).toHaveStyle({ opacity: state === "offline" ? "0.55" : "1" });
      if (expected.motif) {
        expect(screen.getByTestId(`edge-motif-${expected.motif}`)).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId(/edge-motif/)).not.toBeInTheDocument();
      }
      expect(screen.queryByTestId("texture-motif")).not.toBeInTheDocument();

      const illustration = screen.getByTestId("edge-illustration");
      if (state === "overdue" || state === "returning") {
        expect(illustration).toHaveAttribute("src", stage.staticSrc);
        expect(illustration).toHaveAttribute("data-lottie-url", stage.lottieUrl);
      } else {
        expect(illustration).toHaveAttribute("src", `/illustrations/edge-${state}-placeholder.svg`);
        expect(illustration).toHaveAttribute(
          "data-lottie-url",
          `/illustrations/edge-${state}-placeholder.json`,
        );
      }
    });
  }
});
