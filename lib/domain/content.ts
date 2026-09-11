import { DEFAULT_LOCALE, type Locale } from "@/lib/config";

/**
 * Hindi content lands item by item (spec §1.2), so a Hindi reader must still be
 * able to open an English-only article with a clear marker. Never silently hide
 * an item, and never fall back away from the base locale.
 */
export function resolveLocalisedContent<T extends { locale: Locale }>({
  items,
  locale,
}: {
  items: readonly T[];
  locale: Locale;
}): { item: T; isFallback: boolean } | null {
  const exact = items.find((i) => i.locale === locale);
  if (exact) return { item: exact, isFallback: false };

  if (locale !== DEFAULT_LOCALE) {
    const base = items.find((i) => i.locale === DEFAULT_LOCALE);
    if (base) return { item: base, isFallback: true };
  }

  return null;
}
