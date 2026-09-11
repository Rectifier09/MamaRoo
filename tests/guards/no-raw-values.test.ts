import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

function grep(pattern: string): string {
  return execSync(
    `grep -rnE '${pattern}' app components lib --include='*.ts' --include='*.tsx' --include='*.css' 2>/dev/null || true`,
    { encoding: "utf8" },
  ).trim();
}

function grepExcluding(pattern: string, excludedPath: string): string {
  return execSync(
    `grep -rnE '${pattern}' app components lib --include='*.ts' --include='*.tsx' --include='*.css' 2>/dev/null ` +
      `| grep -v '${excludedPath}' ` +
      `|| true`,
    { encoding: "utf8" },
  ).trim();
}

describe("no raw design values outside styles/tokens.css", () => {
  it("contains no hex colour literals", () => {
    // app/layout.tsx is the single sanctioned exception. Next.js requires
    // viewport.themeColor to be a literal string; it cannot read a CSS custom
    // property, because it is serialised into a <meta> tag at build time. That
    // one value must stay in step with --color-bg by hand.
    const hits = grepExcluding("#[0-9a-fA-F]{3,8}\\b", "app/layout.tsx");
    expect(hits).toBe("");
  });

  it("contains no millisecond duration literals", () => {
    expect(grep("[^-a-zA-Z0-9][0-9]+ms")).toBe("");
  });

  it("contains no cubic-bezier literals", () => {
    expect(grep("cubic-bezier")).toBe("");
  });

  it("never references a CSS variable with Tailwind v3 bracket syntax", () => {
    // In Tailwind v3, `duration-[--motion-fast]` was shorthand for
    // `duration-[var(--motion-fast)]`. v4 removed that implicit wrapping, so the
    // same class now emits `transition-duration: --motion-fast` — invalid CSS
    // that the browser drops in silence. Nothing fails, the animation just runs
    // at the default duration forever. The v4 spelling is `duration-(--motion-fast)`,
    // or better, a utility generated from the theme, such as `ease-standard`.
    expect(grep("\\[--")).toBe("");
  });
});
