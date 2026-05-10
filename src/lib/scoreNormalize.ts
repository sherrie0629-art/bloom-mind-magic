/**
 * If AI-returned trait scores collapse to single digits (e.g. all under 35),
 * scale them so the maximum maps to ~85 while keeping relative ratios.
 * Ensures every visible bar is at least 25% so labels look credible.
 */
export function normalizeTraitScores<T extends Record<string, number>>(traits: T | null | undefined): T {
  if (!traits) return traits as T;
  const entries = Object.entries(traits).filter(([, v]) => typeof v === "number" && !Number.isNaN(v));
  if (entries.length === 0) return traits;
  const values = entries.map(([, v]) => v as number);
  const max = Math.max(...values);
  const out: Record<string, number> = { ...traits };
  if (max < 35 && max > 0) {
    const factor = 85 / max;
    for (const [k, v] of entries) {
      out[k] = Math.min(95, Math.max(25, Math.round((v as number) * factor)));
    }
  } else {
    // Floor any individual tiny outlier
    for (const [k, v] of entries) {
      if ((v as number) < 15) out[k] = 15 + Math.round((v as number) * 0.6);
    }
  }
  return out as T;
}
