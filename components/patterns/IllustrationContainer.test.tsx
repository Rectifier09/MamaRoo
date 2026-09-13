import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";

const loadAnimation = vi.fn();
/** Captures the handlers IllustrationContainer registers, so a test can fire
 * lottie-web's own success/failure events directly instead of reaching into
 * the library. */
const listeners = new Map<string, () => void>();

vi.mock("lottie-web", () => ({
  default: { loadAnimation: (...args: unknown[]) => loadAnimation(...args) },
}));

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  loadAnimation.mockReset();
  listeners.clear();
  loadAnimation.mockReturnValue({
    destroy: vi.fn(),
    addEventListener: (event: string, cb: () => void) => listeners.set(event, cb),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("IllustrationContainer", () => {
  it("always renders descriptive alt text for the illustration", () => {
    mockReducedMotion(false);
    render(
      <IllustrationContainer
        lottieUrl="/stage-5.json"
        staticSrc="/stage-5.png"
        alt="Your baby at week 20, about the size of a banana"
      />,
    );
    expect(
      screen.getByAltText("Your baby at week 20, about the size of a banana"),
    ).toBeInTheDocument();
  });

  it("renders the static image only and loads no animation when reduced motion is requested", () => {
    mockReducedMotion(true);
    render(<IllustrationContainer lottieUrl="/s.json" staticSrc="/s.png" alt="Baby at week 20" />);
    expect(loadAnimation).not.toHaveBeenCalled();
    expect(screen.getByAltText("Baby at week 20")).toBeInTheDocument();
  });

  it("loads the animation when motion is allowed", async () => {
    mockReducedMotion(false);
    render(<IllustrationContainer lottieUrl="/s.json" staticSrc="/s.png" alt="Baby at week 20" />);
    await waitFor(() => expect(loadAnimation).toHaveBeenCalledOnce());
  });

  it("keeps the static fallback visible when the animation file fails to load", async () => {
    mockReducedMotion(false);
    loadAnimation.mockImplementation(() => {
      throw new Error("network");
    });
    render(<IllustrationContainer lottieUrl="/missing.json" staticSrc="/s.png" alt="Baby at week 20" />);
    await waitFor(() => expect(screen.getByAltText("Baby at week 20")).toBeVisible());
  });

  it("keeps the static fallback visible when a not-yet-sourced illustration 404s asynchronously", async () => {
    // Unlike the synchronous-throw case above, a missing JSON path doesn't
    // make loadAnimation throw -- lottie-web reports it via a "data_failed"
    // event on the animation instance instead. This is the exact shape of
    // the app/(app)/baby and app/(app)/today stage illustrations right now,
    // since no real Lottie asset has been sourced for any of the nine
    // stages yet (see public/illustrations/README.md).
    mockReducedMotion(false);
    render(<IllustrationContainer lottieUrl="/illustrations/stage-1-placeholder.json" staticSrc="/s.svg" alt="Baby at week 4" />);
    await waitFor(() => expect(listeners.get("data_failed")).toBeDefined());
    listeners.get("data_failed")!();
    expect(screen.getByAltText("Baby at week 4")).toBeVisible();
  });
});
