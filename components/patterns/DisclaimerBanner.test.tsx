import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";

describe("DisclaimerBanner", () => {
  it("renders its text at caption scale in the secondary colour", () => {
    render(<DisclaimerBanner>From reviewed guidance, not a diagnosis.</DisclaimerBanner>);
    const banner = screen.getByTestId("disclaimer");
    expect(banner).toHaveTextContent("From reviewed guidance, not a diagnosis.");
    expect(banner.className).toContain("text-caption");
    expect(banner.className).toContain("text-text-secondary");
  });

  it("is not an alert, because it must never feel alarming", () => {
    render(<DisclaimerBanner>Note</DisclaimerBanner>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders no coloured left border, which current design criticism names as an AI tell", () => {
    render(<DisclaimerBanner>Note</DisclaimerBanner>);
    expect(screen.getByTestId("disclaimer").className).not.toMatch(/border-l/);
  });
});
