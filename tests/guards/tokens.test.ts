import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("styles/tokens.css", "utf8");

const REQUIRED = [
  "--color-bg: #EDE3D3",
  "--color-surface: #F5EEE1",
  "--color-surface-raised: #FFFFFF",
  "--color-text-primary: #2E2822",
  "--color-text-secondary: #5A4F42",
  "--color-accent-primary: #A8482E",
  "--color-accent-secondary: #3D6B58",
  "--color-alert: #8C2F3D",
  "--color-success: #4F6E3D",
  "--color-divider: #D8CBB2",
  "--chart-series-1: #A8482E",
  "--chart-series-2: #3D6B58",
  "--chart-series-3: #C08A28",
  "--chart-series-4: #6B4A3D",
  "--space-xs: 4px",
  "--space-sm: 8px",
  "--space-md: 16px",
  "--space-lg: 24px",
  "--space-xl: 32px",
  "--space-screen: 20px",
  "--radius-sm: 12px",
  "--radius-md: 20px",
  "--radius-lg: 28px",
  "--radius-full: 999px",
  "--motion-fast: 150ms",
  "--motion-base: 250ms",
  "--motion-slow: 400ms",
];

describe("design tokens", () => {
  for (const token of REQUIRED) {
    it(`defines ${token.split(":")[0]} with the specified value`, () => {
      expect(css).toContain(token);
    });
  }

  it("defines no dark-mode palette, by explicit design decision", () => {
    expect(css).not.toContain("prefers-color-scheme");
  });
});
