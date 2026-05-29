// Prefill all tarot card art into the shared cache (tarot_card_art + tarot-card-art bucket).
// Admin-only. Mirrors prefill-mbti-posters style.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BUCKET = "tarot-card-art";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CARDS: { id: number; name: string; upright: string[]; reversed: string[] }[] = [
  { id: 0, name: "The Fool", upright: ["New beginnings", "Freedom", "Adventure"], reversed: ["Recklessness", "Hesitation", "Fear"] },
  { id: 1, name: "The Magician", upright: ["Creativity", "Willpower", "Focus"], reversed: ["Deception", "Lack of skill", "Lost"] },
  { id: 2, name: "The High Priestess", upright: ["Intuition", "Wisdom", "Inner voice"], reversed: ["Ignored intuition", "Secrecy", "Superficiality"] },
  { id: 3, name: "The Empress", upright: ["Abundance", "Nurturing", "Sensuality"], reversed: ["Codependency", "Creative block", "Self-neglect"] },
  { id: 4, name: "The Emperor", upright: ["Authority", "Structure", "Stability"], reversed: ["Controlling", "Rigid", "Lack of discipline"] },
  { id: 5, name: "The Hierophant", upright: ["Tradition", "Faith", "Guidance"], reversed: ["Rebellion", "Dogma", "Blind conformity"] },
  { id: 6, name: "The Lovers", upright: ["Love", "Harmony", "Choices"], reversed: ["Discord", "Imbalance", "Value conflict"] },
  { id: 7, name: "The Chariot", upright: ["Victory", "Determination", "Drive"], reversed: ["Loss of control", "Directionless", "Aggression"] },
  { id: 8, name: "Strength", upright: ["Inner strength", "Courage", "Gentleness"], reversed: ["Self-doubt", "Vulnerability", "Suppressed emotions"] },
  { id: 9, name: "The Hermit", upright: ["Introspection", "Solitude", "Seeking truth"], reversed: ["Isolation", "Avoidance", "Withdrawal"] },
  { id: 10, name: "Wheel of Fortune", upright: ["Change", "Opportunity", "Destiny"], reversed: ["Resisting change", "Bad luck", "Loss of control"] },
  { id: 11, name: "Justice", upright: ["Fairness", "Karma", "Truth"], reversed: ["Injustice", "Avoiding responsibility", "Bias"] },
  { id: 12, name: "The Hanged Man", upright: ["Surrender", "New perspective", "Patience"], reversed: ["Procrastination", "Pointless sacrifice", "Stubbornness"] },
  { id: 13, name: "Death", upright: ["Transformation", "Endings & rebirth", "Letting go"], reversed: ["Resisting change", "Stagnation", "Fear"] },
  { id: 14, name: "Temperance", upright: ["Balance", "Patience", "Moderation"], reversed: ["Extremes", "Imbalance", "Impatience"] },
  { id: 15, name: "The Devil", upright: ["Bondage", "Desire", "Shadow self"], reversed: ["Liberation", "Awakening", "Breaking free"] },
  { id: 16, name: "The Tower", upright: ["Upheaval", "Revelation", "Breaking down"], reversed: ["Avoiding disaster", "Fear of change", "Delayed collapse"] },
  { id: 17, name: "The Star", upright: ["Hope", "Inspiration", "Serenity"], reversed: ["Disappointment", "Lack of faith", "Disconnected"] },
  { id: 18, name: "The Moon", upright: ["Illusion", "Subconscious", "Intuition"], reversed: ["Clarity", "Facing fears", "Release of anxiety"] },
  { id: 19, name: "The Sun", upright: ["Joy", "Success", "Vitality"], reversed: ["Temporary sadness", "Over-optimism", "Delayed gratification"] },
  { id: 20, name: "Judgement", upright: ["Awakening", "Rebirth", "Inner calling"], reversed: ["Self-criticism", "Refusing growth", "Indecision"] },
  { id: 21, name: "The World", upright: ["Completion", "Achievement", "Fulfillment"], reversed: ["Incomplete", "Lack of closure", "Stagnation"] },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateCardImage(cardName: string, isReversed: boolean, keywords: string[]): Promise<Uint8Array | null> {
  const position = isReversed ? "Reversed" : "Upright";
  const prompt = `Create a mystical tarot card illustration for "${cardName}" (${position}). Style: ethereal watercolor with gold accents, dreamy cosmic atmosphere, rich symbolism. The card should evoke ${keywords.join(", ")}. Mystical, elegant, NO TEXT. Square format.`;
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    console.error("AI err", resp.status, (await resp.text()).slice(0, 200));
    return null;
  }
  const data = await resp.json();
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) return null;
  const b64 = url.split(",")[1];
  if (!b64) return null;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let authorized = !!token && token === SERVICE_KEY;
    if (!authorized && token) {
      const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: claimsData } = await authClient.auth.getClaims(token);
      const userId = claimsData?.claims?.sub as string | undefined;
      if (userId) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
        authorized = !!isAdmin;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const cardIds: number[] = Array.isArray(body.cardIds) && body.cardIds.length > 0
      ? body.cardIds : CARDS.map((c) => c.id);
    const orientations: ("up" | "rev")[] = Array.isArray(body.orientations) && body.orientations.length > 0
      ? body.orientations : ["up", "rev"];
    const force = !!body.force;

    const results: any[] = [];
    for (const id of cardIds) {
      const card = CARDS.find((c) => c.id === id);
      if (!card) { results.push({ id, status: "error", error: "unknown card id" }); continue; }
      for (const o of orientations) {
        const isReversed = o === "rev";
        const key = `${card.name} (${isReversed ? "rev" : "up"})`;
        try {
          if (!force) {
            const { data: existing } = await admin
              .from("tarot_card_art")
              .select("image_path")
              .eq("card_id", card.id)
              .eq("is_reversed", isReversed)
              .maybeSingle();
            if ((existing as any)?.image_path) {
              results.push({ card: key, status: "skipped" });
              continue;
            }
          }

          const keywords = isReversed ? card.reversed : card.upright;
          const bin = await generateCardImage(card.name, isReversed, keywords);
          if (!bin) { results.push({ card: key, status: "error", error: "no image" }); await sleep(1500); continue; }

          const objectPath = `shared/${card.id}_${isReversed ? "rev" : "up"}.png`;
          const { error: upErr } = await admin.storage
            .from(BUCKET)
            .upload(objectPath, bin, { contentType: "image/png", upsert: true });
          if (upErr) { results.push({ card: key, status: "error", error: upErr.message }); await sleep(1500); continue; }

          await admin.from("tarot_card_art").upsert(
            { card_id: card.id, is_reversed: isReversed, image_path: objectPath },
            { onConflict: "card_id,is_reversed" }
          );
          results.push({ card: key, status: "generated", path: objectPath });
        } catch (e: any) {
          results.push({ card: key, status: "error", error: e?.message || String(e) });
        }
        await sleep(1500);
      }
    }

    const summary = {
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };
    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
