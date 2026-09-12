import { describe, expect, it, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnline } from "@/lib/pwa/useOnline";

function setNavigatorOnLine(value: boolean | undefined) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("useOnline", () => {
  const original = window.navigator.onLine;

  afterEach(() => {
    setNavigatorOnLine(original);
  });

  it("returns true when navigator.onLine is true", () => {
    setNavigatorOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
  });

  it("returns false when navigator.onLine is false", () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });

  it("flips to false on the offline event and back on the online event", () => {
    setNavigatorOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("returns true when navigator.onLine is undefined, because an unknown state must not lock the app read-only", () => {
    setNavigatorOnLine(undefined);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
  });
});
