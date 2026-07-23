export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("th").replace(/\s+/g, " ");
}

export function matchesSearch(query: string, values: readonly (string | null | undefined)[]): boolean {
  const normalized = normalizeSearch(query);
  return !normalized || normalizeSearch(values.filter(Boolean).join(" ")).includes(normalized);
}
