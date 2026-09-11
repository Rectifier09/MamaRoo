import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/patterns/SectionHeader";

describe("SectionHeader", () => {
  it("renders its text as an h2 at display type scale", () => {
    render(<SectionHeader>Today</SectionHeader>);
    const heading = screen.getByRole("heading", { level: 2, name: "Today" });
    expect(heading.className).toContain("text-h2");
    expect(heading.className).toContain("font-display");
  });

  it("renders an optional trailing action", () => {
    render(<SectionHeader action={<button>See all</button>}>Today</SectionHeader>);
    expect(screen.getByRole("button", { name: "See all" })).toBeInTheDocument();
  });
});
