import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBanner } from "@/components/patterns/ErrorBanner";

describe("ErrorBanner", () => {
  it("states the problem in plain language and always gives a next step", () => {
    render(<ErrorBanner message="We could not load your medicines." nextStep="Check your connection and try again." />);
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your medicines.");
    expect(screen.getByRole("alert")).toHaveTextContent("Check your connection and try again.");
  });

  it("carries an icon so the alert colour is not the only signal", () => {
    render(<ErrorBanner message="Problem" nextStep="Try again." />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("offers a retry when the caller can retry", async () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Problem" nextStep="Try again." onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
