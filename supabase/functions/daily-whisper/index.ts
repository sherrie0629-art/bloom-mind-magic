import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BUCKET = "tarot-card-art";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

function fetchAI(model: string, requestBody: Record<string, unknown>): Promise<Response> {
  return fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...requestBody, model }) });
}

async function signImageUrl(supabase: any, imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(imageUrl, 3600);
  return data?.signedUrl || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    if (action === "deep-reading") return await handleDeepReading(supabaseAdmin, user.id);

    if (action === "check-image") {
      const { draw_id } = body;
      if (!draw_id) throw new Error("Missing draw_id");
      const { data } = await supabaseAdmin.from("daily_tarot_draws").select("image_url").eq("id", draw_id).eq("user_id", user.id).single();
      const imageUrl = await signImageUrl(supabaseAdmin, data?.image_url || null);
      return new Response(JSON.stringify({ imageUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "history") {
      const { data } = await supabaseAdmin.from("daily_tarot_draws").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (!data) return new Response(JSON.stringify({ records: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const records = await Promise.all(data.map(async (r: any) => ({
        ...r,
        image_url: await signImageUrl(supabaseAdmin, r.image_url),
      })));
      return new Response(JSON.stringify({ records }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Tarot card interpretation =====
    const { cardId, cardName, cardNameEn, isReversed, keywords } = body;
    if (cardId === undefined || !cardNameEn) throw new Error("Missing card info");

    const position = isReversed ? "Reversed" : "Upright";
    const keywordsStr = (keywords || []).join(", ");

    const whisperResp = await fetchAI("google/gemini-3-flash-preview", {
      messages: [
        { role: "system", content: `You are a soul guide who blends Jungian psychology with tarot wisdom. Your reading style is warm, insightful, and psychologically grounded. You use concepts like archetypes, shadow work, and the collective unconscious to interpret tarot symbolism. Your goal is to help users understand their current emotional state and gain psychological insight.` },
        { role: "user", content: `I drew the tarot card "${cardNameEn}" in the ${position} position. Keywords: ${keywordsStr}.

Please provide a psychological interpretation of this card for my day. Requirements:
1. Briefly explain the card's psychological symbolism (2-3 sentences)
2. Based on the ${position} meaning, give today's emotional insight (3-4 sentences)
3. Keep it under 200 words, warm yet profound
4. On a new line, start with "💡 " and give a brief actionable tip (under 15 words)

Output the reading directly without titles or separators.` },
      ],
    });

    if (!whisperResp.ok) {
      if (whisperResp.status === 429) return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (whisperResp.status === 402) return new Response(JSON.stringify({ error: "Usage limit reached." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Whisper generation failed");
    }
    const whisperData = await whisperResp.json();
    const fullText = whisperData.choices?.[0]?.message?.content?.trim() || "Every card is a mirror, reflecting who you are right now.";

    const tipMatch = fullText.match(/\n\n?💡\s*(.+)/);
    const whisper = tipMatch ? fullText.slice(0, tipMatch.index).trim() : fullText;
    const actionTip = tipMatch ? tipMatch[1].trim() : "Give yourself a moment of stillness";

    // Score energy 1-5
    const moodScoreResp = await fetchAI("google/gemini-2.5-flash-lite", {
      messages: [
        { role: "user", content: `Tarot card "${cardNameEn}" in ${position} position. Keywords: ${keywordsStr}. Rate the emotional energy on a scale of 1-5 (1=low/negative, 5=high/positive). Reply with only the number.` },
      ],
    });
    let energyScore = 3;
    if (moodScoreResp.ok) {
      const scoreData = await moodScoreResp.json();
      const scoreText = scoreData.choices?.[0]?.message?.content?.trim();
      const parsed = parseInt(scoreText);
      if (parsed >= 1 && parsed <= 5) energyScore = parsed;
    }

    const { data: insertedRow, error: insertError } = await supabaseAdmin.from("daily_tarot_draws").insert({
      user_id: user.id,
      card_id: cardId,
      card_name: cardNameEn,
      is_reversed: isReversed,
      interpretation: `${whisper}\n\n💡 ${actionTip}`,
      action_tip: actionTip,
      energy_score: energyScore,
      image_url: null,
    }).select("id").single();
    if (insertError) console.error("Insert error:", insertError);
    const drawId = insertedRow?.id || null;

    // Generate tarot card art asynchronously
    const imagePrompt = `Create a mystical tarot card illustration for "${cardNameEn}" (${position}). Style: ethereal watercolor with gold accents, dreamy cosmic atmosphere, rich symbolism. The card should evoke ${keywordsStr}. Mystical, elegant, NO TEXT. Square format.`;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const imagePromise = generateAndSaveImage(LOVABLE_API_KEY, supabaseAdmin, user.id, drawId, imagePrompt);
    try { if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) { (EdgeRuntime as any).waitUntil(imagePromise); } } catch {}

    return new Response(JSON.stringify({ whisper, actionTip, imageUrl: null, drawId, energyScore }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("daily-whisper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function generateAndSaveImage(apiKey: string, supabase: any, userId: string, drawId: string | null, imagePrompt: string) {
  try {
    const imageResp = await fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "google/gemini-3.1-flash-image-preview", messages: [{ role: "user", content: imagePrompt }], modalities: ["image", "text"] }) });
    if (!imageResp.ok) { console.error("Image generation failed:", imageResp.status); return; }
    const imageData = await imageResp.json();
    const base64Url = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!base64Url) return;
    const base64Data = base64Url.split(",")[1]; if (!base64Data) return;
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `${userId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, binaryData, { contentType: "image/png", upsert: false });
    if (uploadError) { console.error("Upload error:", uploadError); return; }
    if (drawId) { await supabase.from("daily_tarot_draws").update({ image_url: fileName }).eq("id", drawId); }
  } catch (err) { console.error("Image processing error:", err); }
}

async function handleDeepReading(supabaseAdmin: any, userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: records } = await supabaseAdmin.from("daily_tarot_draws").select("*").eq("user_id", userId).gte("created_at", startOfMonth).order("created_at", { ascending: true });
  if (!records || records.length < 5) {
    return new Response(JSON.stringify({ error: "Draw at least 5 cards this month to unlock Deep Reading." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const summary = records.map((r: any) => {
    const d = new Date(r.created_at);
    return `${d.getMonth() + 1}/${d.getDate()}: ${r.card_name} (${r.is_reversed ? "Reversed" : "Upright"}) — Energy ${r.energy_score || "N/A"}/5`;
  }).join("\n");

  const reportResp = await fetchAI("google/gemini-3-flash-preview", {
    messages: [
      { role: "system", content: `You are "Dr. Maya," a soul guide who blends Jungian psychology with tarot wisdom. Write a monthly tarot insight letter. Your style is like a handwritten letter — warm, authentic, and deeply insightful.

Your letter should:
1. Acknowledge and celebrate the user's daily tarot ritual
2. Identify emotional patterns and psychological themes from the card combinations (recurring archetypes, shadow themes)
3. Offer deep empathy for difficult moments
4. Genuinely celebrate high points
5. Give 1-2 warm, specific self-care suggestions

Format: Start with "Dear Seeker," and end with Dr. Maya's warm signature. 300-500 words. Write entirely in English. The tone should feel personal, like a letter from a wise friend who truly sees you.` },
      { role: "user", content: `Here are my tarot draws this month (${records.length} readings):\n${summary}\n\nPlease write my Monthly Tarot Insight.` },
    ],
    stream: true,
  });
  if (!reportResp.ok) {
    if (reportResp.status === 429) return new Response(JSON.stringify({ error: "Too many requests." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (reportResp.status === 402) return new Response(JSON.stringify({ error: "Usage limit reached." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error("Report generation failed");
  }
  return new Response(reportResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}
