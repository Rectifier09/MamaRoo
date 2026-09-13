export interface BabyNameOption {
  id: string;
  name: string;
  meaning: string;
}

export type BabyNameValidationError = "invalid" | "empty" | "too_long" | "too_many" | "duplicate";

export type BabyNamesValidationResult =
  | { ok: true; value: string[] }
  | { ok: false; error: BabyNameValidationError };

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase();
}

export function searchBabyNames(catalog: BabyNameOption[], query: string): BabyNameOption[] {
  const term = normalized(query.trim());
  if (!term) return catalog;
  return catalog.filter((option) =>
    normalized(`${option.name} ${option.meaning}`).includes(term),
  );
}

export function babyNameDetail(catalog: BabyNameOption[], id: string): BabyNameOption | null {
  return catalog.find((option) => option.id === id) ?? null;
}

export function toggleFavoriteId(favoriteIds: string[], id: string): string[] {
  const unique = [...new Set(favoriteIds)];
  return unique.includes(id) ? unique.filter((favoriteId) => favoriteId !== id) : [...unique, id];
}

export function validateBabyNames({
  names,
  babyCount,
}: {
  names: string[];
  babyCount: 1 | 2;
}): BabyNamesValidationResult {
  if (!Array.isArray(names) || names.some((name) => typeof name !== "string")) {
    return { ok: false, error: "invalid" };
  }

  const values = names.map((name) => name.trim());
  if (values.length > babyCount) return { ok: false, error: "too_many" };
  if (values.some((name) => name.length === 0)) return { ok: false, error: "empty" };
  if (values.some((name) => name.length > 60)) return { ok: false, error: "too_long" };

  const distinct = new Set(values.map(normalized));
  if (distinct.size !== values.length) return { ok: false, error: "duplicate" };
  return { ok: true, value: values };
}

export function chooseBabyName({
  current,
  name,
  babyCount,
}: {
  current: string[];
  name: string;
  babyCount: 1 | 2;
}): BabyNamesValidationResult {
  const trimmed = name.trim();
  const existing = current.find((item) => normalized(item) === normalized(trimmed));
  if (existing) return validateBabyNames({ names: current, babyCount });

  const names = babyCount === 1 ? [trimmed] : [...current, trimmed];
  return validateBabyNames({ names, babyCount });
}
