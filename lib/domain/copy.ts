const BANNED_WORDS = [
  "unlock",
  "empower",
  "seamless",
  "elevate",
  "dive into",
  "harness",
  "leverage",
] as const;

/**
 * Returns a violation code per breach of the voice rules in design document §9.
 * An empty array means the copy is acceptable.
 */
export function validateCopy(text: string): string[] {
  const violations: string[] = [];

  if (text.includes("—")) violations.push("em-dash");

  if (/\bit'?s not just\b[^.!?]*,\s*it'?s\b/i.test(text)) {
    violations.push("not-just-construction");
  }

  for (const word of BANNED_WORDS) {
    const pattern = new RegExp(`(^|[^\\p{L}])${word.replace(" ", "\\s+")}($|[^\\p{L}])`, "iu");
    if (pattern.test(text)) violations.push(`banned-word:${word}`);
  }

  return violations;
}
