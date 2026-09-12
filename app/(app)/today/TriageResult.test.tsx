import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { TriageResult } from "@/app/(app)/today/TriageResult";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/components/AnalyticsProvider", () => ({ track }));

function renderResult(props: Partial<React.ComponentProps<typeof TriageResult>>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TriageResult
        severity={null}
        guidance={null}
        feeling={null}
        doctorName={null}
        clinicName={null}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("TriageResult", () => {
  it("renders the matching severity badge and guidance", () => {
    renderResult({
      severity: "general",
      guidance: { title: "That sounds normal", body: "Rest when you can." },
    });
    expect(screen.getByText(en.severity.general)).toBeInTheDocument();
    expect(screen.getByText("That sounds normal")).toBeInTheDocument();
    expect(screen.getByText("Rest when you can.")).toBeInTheDocument();
  });

  it("shows no severity badge and makes no claim when nothing matched", () => {
    renderResult({ severity: null, guidance: null });
    expect(document.body).not.toHaveTextContent(/you are fine/i);
    // SeverityBadge only ever renders general/contact_clinic/urgent copy; none of
    // those three strings should appear when there was no match.
    expect(screen.queryByText(en.severity.general)).not.toBeInTheDocument();
    expect(screen.queryByText(en.severity.contact_clinic)).not.toBeInTheDocument();
    expect(screen.queryByText(en.severity.urgent)).not.toBeInTheDocument();
  });

  it("renders the urgent result as an alert with her clinic and doctor for context", () => {
    renderResult({
      severity: "urgent",
      guidance: { title: "Contact your clinic now", body: "Call right away." },
      doctorName: "Dr Rao",
      clinicName: "Sunrise Clinic",
    });
    const urgent = screen.getByText(en.severity.urgent);
    expect(urgent.closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByText(/Dr Rao/)).toBeInTheDocument();
    expect(screen.getByText(/Sunrise Clinic/)).toBeInTheDocument();
  });

  it("always renders the disclaimer banner, matched or not", () => {
    renderResult({ severity: null, guidance: null });
    expect(screen.getByTestId("disclaimer")).toHaveTextContent(en.disclaimer.reviewedGuidance);
    renderResult({ severity: "general", guidance: { title: "t", body: "b" } });
    expect(screen.getAllByTestId("disclaimer").length).toBeGreaterThan(0);
  });

  it("uses the worried framing line only when the worried chip was tapped", () => {
    renderResult({ feeling: "worried", severity: null, guidance: null });
    expect(screen.getByText(en.today.triage.worriedIntro)).toBeInTheDocument();
    expect(screen.queryByText(en.today.triage.intro)).not.toBeInTheDocument();
  });

  it("uses the neutral framing line for any other feeling or none", () => {
    renderResult({ feeling: null, severity: null, guidance: null });
    expect(screen.getByText(en.today.triage.intro)).toBeInTheDocument();
  });

  it("emits triage_result_shown with the severity only, never the guidance text", () => {
    renderResult({ severity: "urgent", guidance: { title: "t", body: "b" } });
    expect(track).toHaveBeenCalledWith(EVENTS.triage_result_shown, { severity: "urgent" });
  });

  it("emits triage_result_shown with no_match when nothing matched", () => {
    renderResult({ severity: null, guidance: null });
    expect(track).toHaveBeenCalledWith(EVENTS.triage_result_shown, { severity: "no_match" });
  });
});
