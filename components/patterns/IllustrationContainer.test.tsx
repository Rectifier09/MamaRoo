import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";

const loadAnimation = vi.fn();

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
  loadAnimation.mockReturnValue({ destroy: vi.fn(), addEventListener: vi.fn() });
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
});
