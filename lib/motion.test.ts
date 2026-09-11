import { describe, expect, it, vi, afterEach } from "vitest";
import { motionDuration, prefersReducedMotion } from "@/lib/motion";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("motion", () => {
  it("reports the user's reduced-motion preference", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns the token duration in milliseconds when motion is allowed", () => {
    mockReducedMotion(false);
    expect(motionDuration("fast")).toBe(150);
    expect(motionDuration("base")).toBe(250);
    expect(motionDuration("slow")).toBe(400);
    expect(motionDuration("hero")).toBe(900);
  });

  it("collapses every duration to zero when reduced motion is requested", () => {
    mockReducedMotion(true);
    expect(motionDuration("hero")).toBe(0);
    expect(motionDuration("fast")).toBe(0);
  });

  it("treats a missing matchMedia as motion allowed", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("stays consistent with the CSS motion tokens", async () => {
    const css = (await import("node:fs")).readFileSync("styles/tokens.css", "utf8");
    for (const [token, ms] of Object.entries({ fast: 150, base: 250, slow: 400, hero: 900 })) {
      expect(css).toContain(`--motion-${token}: ${ms}ms`);
    }
  });
});
