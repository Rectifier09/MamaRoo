export type MotionToken = "fast" | "base" | "slow" | "hero";

const DURATIONS: Record<MotionToken, number> = {
  fast: 150,
  base: 250,
  slow: 400,
  hero: 900,
};

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Duration in milliseconds for JS-driven animation. Returns 0 when the user
 * asked for reduced motion, which callers must treat as "change state instantly".
 */
export function motionDuration(token: MotionToken): number {
  return prefersReducedMotion() ? 0 : DURATIONS[token];
}
