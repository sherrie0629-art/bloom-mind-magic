// Detect "daily limit reached" (HTTP 429) errors thrown by supabase.functions.invoke
// for the assessment edge functions, so the UI can show a friendly toast instead
// of leaking the raw "Edge function returned a non-2xx" message.
export function isDailyLimitError(e: any): boolean {
  if (!e) return false;
  try {
    const status = e?.context?.status;
    if (status === 429) return true;
  } catch {}
  const msg = String(e?.message || e || "").toLowerCase();
  return msg.includes("429") || msg.includes("limit reached") || msg.includes("daily");
}
