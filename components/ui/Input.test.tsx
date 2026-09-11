import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("associates its visible label with the field", () => {
    render(<Input id="weight" label="Weight in kilograms" />);
    expect(screen.getByLabelText("Weight in kilograms")).toBeInTheDocument();
  });

  it("passes the native type through so each OS shows its own control", () => {
    render(<Input id="dob" label="Date" type="date" />);
    expect(screen.getByLabelText("Date")).toHaveAttribute("type", "date");
  });

  it("renders a specific error message and links it to the field", () => {
    render(<Input id="w" label="Weight" error="Enter a weight between 30 and 200 kg" />);
    const field = screen.getByLabelText("Weight");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a weight between 30 and 200 kg");
  });

  it("never renders a generic error string", () => {
    render(<Input id="w" label="Weight" error="Enter a weight between 30 and 200 kg" />);
    expect(screen.queryByText(/invalid input/i)).not.toBeInTheDocument();
  });

  it("accepts Devanagari text without a fixed-height container", async () => {
    render(<Input id="name" label="नाम" />);
    const field = screen.getByLabelText("नाम");
    await userEvent.type(field, "प्रियंका शर्मा");
    expect(field).toHaveValue("प्रियंका शर्मा");
    expect(field.className).not.toMatch(/\bh-\d/);
    expect(field.className).toContain("min-h");
  });

  it("marks the filled state so the floating label stays raised", async () => {
    render(<Input id="city" label="City" />);
    const field = screen.getByLabelText("City");
    await userEvent.type(field, "Pune");
    expect(field).toHaveAttribute("data-filled", "true");
  });
});
