import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioIndicator } from "@/components/patterns/AudioIndicator";

describe("AudioIndicator", () => {
  it("is a labelled control, because an icon alone is not accessible", () => {
    render(<AudioIndicator playing={false} onPlay={() => {}} label="Listen to this article" />);
    expect(screen.getByRole("button", { name: "Listen to this article" })).toBeInTheDocument();
  });

  it("reports its playing state", () => {
    render(<AudioIndicator playing onPlay={() => {}} label="Listen" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("reports a request to play", async () => {
    const onPlay = vi.fn();
    render(<AudioIndicator playing={false} onPlay={onPlay} label="Listen" />);
    await userEvent.click(screen.getByRole("button"));
    expect(onPlay).toHaveBeenCalledOnce();
  });
});
