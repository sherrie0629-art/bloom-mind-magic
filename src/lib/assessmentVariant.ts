// Per-user assessment question-set rotation.
// Cache is shared across users to save LLM cost, but we keep N variants per
// (assessment, locale) and rotate on the client so the same user is unlikely
// to see the same question set twice in a row.

export const VARIANT_COUNT = 5;

const storageKey = (type: string, locale: string) => `assess-variant:${type}:${locale}`;

export function getNextVariant(type: string, locale: string): number {
  const key = storageKey(type, locale);
  try {
    const raw = localStorage.getItem(key);
    const last = raw === null ? -1 : parseInt(raw, 10);
    const base = Number.isFinite(last) && last >= 0 ? last + 1 : Math.floor(Math.random() * VARIANT_COUNT);
    const next = ((base % VARIANT_COUNT) + VARIANT_COUNT) % VARIANT_COUNT;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return Math.floor(Math.random() * VARIANT_COUNT);
  }
}
