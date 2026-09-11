import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "@/components/ui/Toggle";

describe("Toggle", () => {
  it("reports its checked state to assistive technology", () => {
    render(<Toggle id="t" label="Reminders" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Reminders" })).toHaveAttribute("aria-checked", "true");
  });

  it("reports the change when toggled", async () => {
    const onCheckedChange = vi.fn();
    render(<Toggle id="t" label="Reminders" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("carries a knob so the checked state is never colour alone", () => {
    render(<Toggle id="t" label="Reminders" checked onCheckedChange={() => {}} />);
    expect(screen.getByTestId("toggle-knob")).toBeInTheDocument();
  });

  it("does not report changes when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Toggle id="t" label="Reminders" checked={false} disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
