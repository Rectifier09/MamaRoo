/**
 * The single shared vocabulary for the PCPNDT Act prohibition (spec §1.4): the product
 * must never ask for, store, display, infer, or discuss the sex of the foetus. No other
 * file declares this list — `schema-pcpndt.test.ts` imports it to scan the schema and
 * every shipped file, and `lib/ai/guardrails.ts` imports it (added in Session 29) to
 * block sex-determination questions before retrieval and before any provider call.
 *
 * Scoped to sex/gender-determination terms, not every occurrence of a common word, so
 * the schema/content scan below stays meaningful rather than flagging unrelated prose.
 * Session 29 extends this list with adversarial transliteration and misspelling cases
 * once the guardrail's own test suite is written; this is the baseline it builds on.
 */
export const FORBIDDEN = [
  // English
  "gender",
  "boy or girl",
  "girl or boy",
  "baby's sex",
  "babys sex",
  "sex of the baby",
  "sex of the foetus",
  "sex of the fetus",
  "gender reveal",
  "gender prediction",
  "sex determination",
  "know the gender",
  // Hindi (Devanagari) and common transliterations
  "लड़का",
  "लड़की",
  "लिंग",
  "ladka",
  "ladki",
  "ladki hai ya ladka",
];
