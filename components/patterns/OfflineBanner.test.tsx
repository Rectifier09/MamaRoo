import { describe, expect, it, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value });
}

function renderBanner() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OfflineBanner />
    </NextIntlClientProvider>,
  );
}

describe("OfflineBanner", () => {
  const original = window.navigator.onLine;

  afterEach(() => {
    setNavigatorOnLine(original);
  });

  it("renders nothing when online", () => {
    setNavigatorOnLine(true);
    renderBanner();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the offline message with an icon when offline", () => {
    setNavigatorOnLine(false);
    renderBanner();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(en.common.offline);
    expect(status.querySelector("svg")).not.toBeNull();
  });
});
