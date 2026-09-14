import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import { BottomNav } from "@/components/patterns/BottomNav";
import { EVENTS } from "@/lib/analytics/events";

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

// BottomNav reads the active tab from usePathname(), not a server-passed prop
// -- a server-computed activePath went stale across client-side tab switches
// because the (app) layout that used to compute it is cached, not re-run, on
// every navigation within its own route tree.
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => mockUsePathname() }));

beforeEach(() => {
  track.mockReset();
});

function renderNav(activePath: string) {
  mockUsePathname.mockReturnValue(activePath);
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BottomNav />
    </NextIntlClientProvider>,
  );
}

describe("BottomNav", () => {
  it("renders exactly the five tabs, in order", () => {
    renderNav("/today");
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/today",
      "/baby",
      "/care",
      "/guide",
      "/me",
    ]);
  });

  it("marks the active tab for assistive technology", () => {
    renderNav("/care");
    expect(screen.getByRole("link", { name: /^care$/i })).toHaveAttribute("aria-current", "page");
  });

  it("signals the active tab with a weight change as well as colour", () => {
    renderNav("/care");
    expect(screen.getByRole("link", { name: /^care$/i }).className).toContain("font-medium");
  });

  it("treats a sub-route as its parent tab", () => {
    renderNav("/care/medicines");
    expect(screen.getByRole("link", { name: /^care$/i })).toHaveAttribute("aria-current", "page");
  });

  it("meets the touch target on every tab", () => {
    renderNav("/today");
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("tap-target");
    }
  });

  it("respects the home-indicator safe area", () => {
    renderNav("/today");
    expect(screen.getByRole("navigation").className).toContain("safe-bottom");
  });

  it("labels every tab in Hindi too", () => {
    mockUsePathname.mockReturnValue("/today");
    render(
      <NextIntlClientProvider locale="hi" messages={hi}>
        <BottomNav />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: "आज" })).toBeInTheDocument();
  });

  it("captures tab_viewed with the tapped tab", async () => {
    const user = userEvent.setup();
    renderNav("/today");
    await user.click(screen.getByRole("link", { name: /^care$/i }));
    expect(track).toHaveBeenCalledWith(EVENTS.tab_viewed, { tab: "care" });
  });

  // The regression this component exists to prevent: a server-computed active
  // tab goes stale across client-side navigations because Next.js caches the
  // shared layout rather than re-running it per tab switch. usePathname() is
  // reactive, so a re-render with a new pathname must update which tab is
  // marked active without remounting the component.
  it("updates the active tab when the pathname changes on a re-render, not just on mount", () => {
    mockUsePathname.mockReturnValue("/baby");
    const { rerender } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BottomNav />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: /^baby$/i })).toHaveAttribute("aria-current", "page");

    mockUsePathname.mockReturnValue("/today");
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <BottomNav />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: /^today$/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /^baby$/i })).not.toHaveAttribute("aria-current");
  });
});
