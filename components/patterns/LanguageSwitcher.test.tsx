import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher } from "@/components/patterns/LanguageSwitcher";

const onSelect = vi.fn();

describe("LanguageSwitcher", () => {
  it("offers both languages, each labelled in its own script", () => {
    render(<LanguageSwitcher current="en" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "हिंदी" })).toBeInTheDocument();
  });

  it("marks the current language with a pressed state, not colour alone", () => {
    render(<LanguageSwitcher current="hi" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "हिंदी" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the chosen language", async () => {
    render(<LanguageSwitcher current="en" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(onSelect).toHaveBeenCalledWith("hi");
  });

  it("does not report a change when the current language is tapped again", async () => {
    onSelect.mockClear();
    render(<LanguageSwitcher current="en" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
