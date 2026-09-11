import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/patterns/EmptyState";

describe("EmptyState", () => {
  it("shows the section-specific message it was given", () => {
    render(
      <EmptyState
        iconName="Pill"
        message="Nothing here yet. Add your first medicine when you're ready."
      />,
    );
    expect(
      screen.getByText("Nothing here yet. Add your first medicine when you're ready."),
    ).toBeInTheDocument();
  });

  it("renders the decorative motif hidden from assistive technology", () => {
    render(<EmptyState iconName="Pill" message="Nothing here yet." />);
    expect(screen.getByTestId("texture-motif")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a duotone hero icon, the treatment reserved for empty states", () => {
    render(<EmptyState iconName="Pill" message="Nothing here yet." />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("data-size", "hero");
  });

  it("renders an optional action when one is given", () => {
    render(
      <EmptyState iconName="Pill" message="Nothing here yet." action={<button>Add medicine</button>} />,
    );
    expect(screen.getByRole("button", { name: "Add medicine" })).toBeInTheDocument();
  });
});
