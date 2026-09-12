import { describe, expect, it } from "vitest";
import { triage, type SymptomRule } from "@/lib/domain/triage";

// Non-medical placeholder rules. Real rules are product-owner content (Gate B).
const rules: SymptomRule[] = [
  { id: "r-general", match_terms: ["tired", "thaka"], severity: "general", priority: 10 },
  { id: "r-clinic", match_terms: ["swelling", "sujan"], severity: "contact_clinic", priority: 50 },
  { id: "r-urgent", match_terms: ["bleeding", "khoon"], severity: "urgent", priority: 90 },
  { id: "r-urgent-phrase", match_terms: ["very bad headache"], severity: "urgent", priority: 95 },
  { id: "r-urgent-hindi", match_terms: ["तेज़ दर्द"], severity: "urgent", priority: 95 },
];

describe("triage", () => {
  it("returns no match for text that matches nothing", () => {
    expect(triage({ text: "I watched a film today", rules })).toEqual({ severity: null, matchedRuleId: null });
  });

  it("matches a general term", () => {
    expect(triage({ text: "I feel tired", rules })).toEqual({ severity: "general", matchedRuleId: "r-general" });
  });

  it("matches regardless of case", () => {
    expect(triage({ text: "TIRED all day", rules }).severity).toBe("general");
  });

  it("matches despite surrounding punctuation", () => {
    expect(triage({ text: "so much swelling!!", rules }).severity).toBe("contact_clinic");
  });

  it("returns the highest severity when several terms match", () => {
    const result = triage({ text: "I am tired and there is bleeding", rules });
    expect(result.severity).toBe("urgent");
    expect(result.matchedRuleId).toBe("r-urgent");
  });

  it("prefers the higher priority rule within the same severity", () => {
    expect(triage({ text: "a very bad headache and bleeding", rules }).matchedRuleId).toBe("r-urgent-phrase");
  });

  it("matches a multi-word phrase only when the whole phrase is present", () => {
    expect(triage({ text: "a bad headache", rules }).severity).toBeNull();
  });

  it("matches a Devanagari term", () => {
    expect(triage({ text: "मुझे तेज़ दर्द हो रहा है", rules }).severity).toBe("urgent");
  });

  it("matches a transliterated term, because people type Hinglish", () => {
    expect(triage({ text: "bahut thaka hua lag raha hai", rules }).severity).toBe("general");
  });

  it("does not match a term occurring inside a longer word", () => {
    expect(triage({ text: "I went to the retired teachers meeting", rules }).severity).toBeNull();
  });

  it("returns no match for empty or whitespace text", () => {
    expect(triage({ text: "   ", rules }).severity).toBeNull();
  });

  it("returns no match when there are no rules at all, rather than guessing", () => {
    expect(triage({ text: "bleeding", rules: [] })).toEqual({ severity: null, matchedRuleId: null });
  });

  it("ignores an inactive rule", () => {
    const inactive = rules.map((r) => ({ ...r, is_active: false }));
    expect(triage({ text: "bleeding", rules: inactive }).severity).toBeNull();
  });

  it("collapses repeated whitespace before matching", () => {
    expect(triage({ text: "a very    bad     headache", rules }).severity).toBe("urgent");
  });
});
