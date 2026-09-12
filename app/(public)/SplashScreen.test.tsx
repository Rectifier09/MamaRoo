import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { PRODUCT_NAME } from "@/lib/config";
import { SplashScreen, SPLASH_DURATION_MS, HOLD_AFTER_SETTLE_MS } from "@/app/(public)/SplashScreen";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const prefersReducedMotion = vi.fn();
vi.mock("@/lib/motion", () => ({
  prefersReducedMotion: () => prefersReducedMotion(),
}));

function renderScreen(next: string | null = null) {
  return render(<SplashScreen next={next} />);
}

beforeEach(() => {
  replace.mockReset();
  prefersReducedMotion.mockReset().mockReturnValue(false);
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("SplashScreen", () => {
  it("renders the wordmark", () => {
    renderScreen();
    expect(screen.getByText("Mama")).toBeInTheDocument();
    expect(screen.getByText("Roo")).toBeInTheDocument();
  });

  it("renders the tagline and the journey pill, always in English regardless of locale", () => {
    renderScreen();
    expect(screen.getByText("With You, From Bump to Baby & Beyond.")).toBeInTheDocument();
    expect(screen.getByText("Gentle care, every day")).toBeInTheDocument();
  });

  it("gives the logo mark an accessible name", () => {
    renderScreen();
    // The accessible name concatenates both aria-labelledby references
    // (title + desc), per spec -- so this checks it starts with the title.
    expect(screen.getByRole("img", { name: new RegExp(`^${PRODUCT_NAME}`) })).toBeInTheDocument();
  });

  it("hides the ambient background and sparkle layers from assistive technology", () => {
    renderScreen();
    expect(screen.getByTestId("splash-ambient")).toHaveAttribute("aria-hidden", "true");
    for (const sparkle of screen.getAllByTestId("splash-sparkle")) {
      expect(sparkle).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("does not navigate before the animation has settled plus the hold", () => {
    renderScreen();
    act(() => vi.advanceTimersByTime(SPLASH_DURATION_MS + HOLD_AFTER_SETTLE_MS - 1));
    expect(replace).not.toHaveBeenCalled();
  });

  it("navigates to language select once the animation has settled and the hold has elapsed", () => {
    renderScreen();
    act(() => vi.advanceTimersByTime(SPLASH_DURATION_MS + HOLD_AFTER_SETTLE_MS));
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("carries a deep-link target through to the redirect", () => {
    renderScreen("/care/summary");
    act(() => vi.advanceTimersByTime(SPLASH_DURATION_MS + HOLD_AFTER_SETTLE_MS));
    expect(replace).toHaveBeenCalledWith("/welcome?next=%2Fcare%2Fsummary");
  });

  it("with reduced motion, skips the settle wait and only holds for the fixed duration", () => {
    prefersReducedMotion.mockReturnValue(true);
    renderScreen();
    act(() => vi.advanceTimersByTime(HOLD_AFTER_SETTLE_MS - 1));
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("navigates immediately when tapped, before the sequence would otherwise finish", () => {
    renderScreen();
    fireEvent.click(screen.getByTestId("splash-screen"));
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("does not double-navigate if tapped after it already auto-advanced", () => {
    renderScreen();
    act(() => vi.advanceTimersByTime(SPLASH_DURATION_MS + HOLD_AFTER_SETTLE_MS));
    fireEvent.click(screen.getByTestId("splash-screen"));
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
