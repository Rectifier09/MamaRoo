import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "@/components/ui/BottomSheet";

describe("BottomSheet", () => {
  it("renders nothing when closed", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes itself as a labelled modal dialog when open", () => {
    render(
      <BottomSheet open onClose={() => {}} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Add medicine");
  });

  it("closes on the scrim", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId("sheet-scrim"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on the platform back gesture instead of leaving the screen underneath", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    fireEvent.popState(window);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
