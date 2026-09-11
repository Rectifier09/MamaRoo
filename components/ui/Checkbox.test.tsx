import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
  it("reports its checked state to assistive technology", () => {
    render(<Checkbox id="c" label="I agree" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "I agree" })).toBeChecked();
  });

  it("reports the change when toggled", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox id="c" label="I agree" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("carries a tick mark so the checked state is never colour alone", () => {
    render(<Checkbox id="c" label="I agree" checked onCheckedChange={() => {}} />);
    expect(screen.getByTestId("checkbox-mark")).toBeInTheDocument();
  });

  it("does not report changes when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox id="c" label="I agree" checked={false} disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
