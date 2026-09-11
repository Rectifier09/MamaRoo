import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Icon } from "@/components/ui/Icon";

describe("Icon", () => {
  it("is hidden from assistive technology when it carries no meaning", () => {
    render(<Icon name="Pill" />);
    expect(screen.getByTestId("icon").getAttribute("aria-hidden")).toBe("true");
  });

  it("is announced when it carries meaning of its own", () => {
    render(<Icon name="Warning" label="Urgent" />);
    expect(screen.getByLabelText("Urgent")).toBeInTheDocument();
  });

  it("uses the nav token size for navigation icons", () => {
    render(<Icon name="House" size="nav" />);
    expect(screen.getByTestId("icon")).toHaveAttribute("data-size", "nav");
  });

  it("renders nothing rather than a broken glyph for an unknown icon name", () => {
    render(<Icon name="NotARealIconName" />);
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });
});
