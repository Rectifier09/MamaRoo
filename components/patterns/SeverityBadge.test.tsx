import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { SeverityBadge } from "@/components/patterns/SeverityBadge";

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SeverityBadge", () => {
  it.each([
    ["general", "General"],
    ["contact_clinic", "Contact your clinic"],
    ["urgent", "Urgent"],
  ] as const)("renders an icon and a label for %s, never colour alone", (severity, label) => {
    renderWithIntl(<SeverityBadge severity={severity} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("announces the urgent level as an alert", () => {
    renderWithIntl(<SeverityBadge severity="urgent" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not announce the general level as an alert", () => {
    renderWithIntl(<SeverityBadge severity="general" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
