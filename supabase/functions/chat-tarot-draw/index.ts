// Chat tarot draw: pick a random tarot card and return its art for inline chat display.
// Reuses tarot_card_art shared cache + tarot-card-art storage bucket.
// No per-day limit (chat-bound), but rate-limited per user via usage_tracking.chat_count is already enforced upstream.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BUCKET = "tarot-card-art";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal tarot card pool — mirror of frontend src/data/tarotCards.ts (id + names + keywords).
// We keep it inline to avoid cross-import complexity in the edge runtime.
const CARDS: { id: number; name: string; nameCn: string; emoji: string; upright: string[]; reversed: string[] }[] = [
  { id: 0, name: "The Fool", nameCn: "愚者", emoji: "🃏", upright: ["New beginnings", "Freedom", "Adventure"], reversed: ["Recklessness", "Hesitation", "Fear"] },
  { id: 1, name: "The Magician", nameCn: "魔术师", emoji: "🎩", upright: ["Creativity", "Willpower", "Focus"], reversed: ["Deception", "Lack of skill", "Lost"] },
  { id: 2, name: "The High Priestess", nameCn: "女祭司", emoji: "🌙", upright: ["Intuition", "Wisdom", "Inner voice"], reversed: ["Ignored intuition", "Secrecy", "Superficiality"] },
  { id: 3, name: "The Empress", nameCn: "女皇", emoji: "👑", upright: ["Abundance", "Nurturing", "Sensuality"], reversed: ["Codependency", "Creative block", "Self-neglect"] },
  { id: 4, name: "The Emperor", nameCn: "皇帝", emoji: "🏛️", upright: ["Authority", "Structure", "Stability"], reversed: ["Controlling", "Rigid", "Lack of discipline"] },
  { id: 5, name: "The Hierophant", nameCn: "教皇", emoji: "📿", upright: ["Tradition", "Faith", "Guidance"], reversed: ["Rebellion", "Dogma", "Blind conformity"] },
  { id: 6, name: "The Lovers", nameCn: "恋人", emoji: "💕", upright: ["Love", "Harmony", "Choices"], reversed: ["Discord", "Imbalance", "Value conflict"] },
  { id: 7, name: "The Chariot", nameCn: "战车", emoji: "⚡", upright: ["Victory", "Determination", "Drive"], reversed: ["Loss of control", "Directionless", "Aggression"] },
  { id: 8, name: "Strength", nameCn: "力量", emoji: "🦁", upright: ["Inner strength", "Courage", "Gentleness"], reversed: ["Self-doubt", "Vulnerability", "Suppressed emotions"] },
  { id: 9, name: "The Hermit", nameCn: "隐者", emoji: "🏔️", upright: ["Introspection", "Solitude", "Seeking truth"], reversed: ["Isolation", "Avoidance", "Withdrawal"] },
  { id: 10, name: "Wheel of Fortune", nameCn: "命运之轮", emoji: "🎡", upright: ["Change", "Opportunity", "Destiny"], reversed: ["Resisting change", "Bad luck", "Loss of control"] },
  { id: 11, name: "Justice", nameCn: "正义", emoji: "⚖️", upright: ["Fairness", "Karma", "Truth"], reversed: ["Injustice", "Avoiding responsibility", "Bias"] },
  { id: 12, name: "The Hanged Man", nameCn: "倒吊人", emoji: "🔄", upright: ["Surrender", "New perspective", "Patience"], reversed: ["Procrastination", "Pointless sacrifice", "Stubbornness"] },
  { id: 13, name: "Death", nameCn: "死神", emoji: "🦋", upright: ["Transformation", "Endings & rebirth", "Letting go"], reversed: ["Resisting change", "Stagnation", "Fear"] },
  { id: 14, name: "Temperance", nameCn: "节制", emoji: "🌈", upright: ["Balance", "Patience", "Moderation"], reversed: ["Extremes", "Imbalance", "Impatience"] },
  { id: 15, name: "The Devil", nameCn: "恶魔", emoji: "🔗", upright: ["Bondage", "Desire", "Shadow self"], reversed: ["Liberation", "Awakening", "Breaking free"] },
  { id: 16, name: "The Tower", nameCn: "高塔", emoji: "⚡", upright: ["Upheaval", "Revelation", "Breaking down"], reversed: ["Avoiding disaster", "Fear of change", "Delayed collapse"] },
  { id: 17, name: "The Star", nameCn: "星星", emoji: "⭐", upright: ["Hope", "Inspiration", "Serenity"], reversed: ["Disappointment", "Lack of faith", "Disconnected"] },
  { id: 18, name: "The Moon", nameCn: "月亮", emoji: "🌕", upright: ["Illusion", "Subconscious", "Intuition"], reversed: ["Clarity", "Facing fears", "Release of anxiety"] },
  { id: 19, name: "The Sun", nameCn: "太阳", emoji: "☀️", upright: ["Joy", "Success", "Vitality"], reversed: ["Temporary sadness", "Over-optimism", "Delayed gratification"] },
  { id: 20, name: "Judgement", nameCn: "审判", emoji: "📯", upright: ["Awakening", "Rebirth", "Inner calling"], reversed: ["Self-criticism", "Refusing growth", "Indecision"] },
  { id: 21, name: "The World", nameCn: "世界", emoji: "🌍", upright: ["Completion", "Achievement", "Fulfillment"], reversed: ["Incomplete", "Lack of closure", "Stagnation"] },
];

async function generateCardImage(cardName: string, isReversed: boolean, keywords: string[]): Promise<Uint8Array | null> {
  const position = isReversed ? "Reversed" : "Upright";
  const prompt = `Create a mystical tarot card illustration for "${cardName}" (${position}). Style: ethereal watercolor with gold accents, dreamy cosmic atmosphere, rich symbolism. The card should evoke ${keywords.join(", ")}. Mystical, elegant, NO TEXT. Square format.`;
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3.1-flash-image-preview", messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
  });
  if (!resp.ok) return null;
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
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    // Allow anon? Require login to avoid abuse.
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Optional sign-only mode: re-sign image URLs for previously drawn cards
    let body: any = {};
    try { body = await req.json(); } catch { /* ignore */ }
    if (body?.mode === "sign" && Array.isArray(body.paths)) {
      const out: Record<string, string | null> = {};
      await Promise.all(
        (body.paths as string[]).filter(Boolean).slice(0, 50).map(async (p) => {
          const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(p, 3600);
          out[p] = signed?.signedUrl || null;
        })
      );
      return new Response(JSON.stringify({ signed: out }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pick a random card + orientation
    const card = CARDS[Math.floor(Math.random() * CARDS.length)];
    const isReversed = Math.random() < 0.3; // 30% reversed
    const keywords = isReversed ? card.reversed : card.upright;

    // Check shared card art cache
    const { data: cached } = await supabase
      .from("tarot_card_art")
      .select("image_path")
      .eq("card_id", card.id)
      .eq("is_reversed", isReversed)
      .maybeSingle();

    let imagePath = (cached as any)?.image_path as string | undefined;

    if (!imagePath) {
      // Cache miss — generate synchronously
      try {
        const bin = await generateCardImage(card.name, isReversed, keywords);
        if (bin) {
          const fileName = `shared/${card.id}_${isReversed ? "rev" : "up"}_${Date.now()}.png`;
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(fileName, bin, { contentType: "image/png", upsert: false });
          if (!upErr) {
            imagePath = fileName;
            await supabase.from("tarot_card_art").upsert(
              { card_id: card.id, is_reversed: isReversed, image_path: fileName },
              { onConflict: "card_id,is_reversed", ignoreDuplicates: true }
            );
          } else {
            console.error("upload err", upErr);
          }
        }
      } catch (e) {
        console.error("gen err", e);
      }
    }

    let imageUrl: string | null = null;
    if (imagePath) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(imagePath, 3600);
      imageUrl = signed?.signedUrl || null;
    }

    return new Response(JSON.stringify({
      cardId: card.id,
      cardName: card.name,
      cardNameCn: card.nameCn,
      emoji: card.emoji,
      isReversed,
      keywords,
      imagePath: imagePath || null,
      imageUrl,
      imageStatus: imageUrl ? "ready" : "failed",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("chat-tarot-draw error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
