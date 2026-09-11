import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

function Harness() {
  const { show } = useToast();
  return (
    <>
      <button onClick={() => show("Saved")}>first</button>
      <button onClick={() => show("Medicine logged")}>second</button>
    </>
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("announces a brief confirmation politely", async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("first"));
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Saved");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("replaces an existing toast instead of queueing or stacking", async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("first"));
    await userEvent.click(screen.getByText("second"));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Medicine logged");
  });

  it("dismisses itself without requiring a tap", async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("first"));
    act(() => void vi.advanceTimersByTime(2500));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
