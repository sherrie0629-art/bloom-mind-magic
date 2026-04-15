import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BUCKET = "tarot-card-art";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fetchAI(model: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { cardId, cardName, isReversed, keywords } = await req.json();
    if (cardId === undefined || !cardName) {
      return new Response(JSON.stringify({ error: "Missing card info" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if already drawn today
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("tarot_draws")
      .select("*")
      .eq("user_id", user.id)
      .eq("draw_date", today)
      .maybeSingle();

    if (existing) {
      // Return existing draw
      let imageUrl: string | null = null;
      if (existing.image_status === "ready" && existing.image_path) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(existing.image_path, 3600);
        imageUrl = signed?.signedUrl || null;
      }
      return new Response(JSON.stringify({
        id: existing.id,
        cardId: existing.card_id,
        cardName: existing.card_name,
        isReversed: existing.is_reversed,
        interpretation: existing.interpretation,
        actionTip: existing.action_tip,
        energyScore: existing.energy_score,
        imageUrl,
        imageStatus: existing.image_status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const position = isReversed ? "Reversed" : "Upright";
    const keywordsStr = (keywords || []).join(", ");

    // Generate interpretation
    const whisperResp = await fetchAI("google/gemini-3-flash-preview", {
      messages: [
        { role: "system", content: "You are a soul guide who blends Jungian psychology with tarot wisdom. Your readings are warm, insightful, and psychologically grounded." },
        { role: "user", content: `I drew "${cardName}" in the ${position} position. Keywords: ${keywordsStr}.

Please provide a psychological interpretation for my day:
1. Briefly explain the card's psychological symbolism (2-3 sentences)
2. Based on the ${position} meaning, give today's emotional insight (3-4 sentences)
3. Keep it under 200 words, warm yet profound
4. On a new line, start with "💡 " and give a brief actionable tip (under 15 words)

Output the reading directly without titles or separators.` },
      ],
    });

    if (!whisperResp.ok) {
      const status = whisperResp.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Usage limit reached." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI generation failed");
    }

    const aiData = await whisperResp.json();
    const fullText = aiData.choices?.[0]?.message?.content?.trim() || "Every card is a mirror, reflecting who you are right now.";
    const tipMatch = fullText.match(/\n\n?💡\s*(.+)/);
    const interpretation = tipMatch ? fullText.slice(0, tipMatch.index).trim() : fullText;
    const actionTip = tipMatch ? tipMatch[1].trim() : "Give yourself a moment of stillness.";

    // Score energy 1-5
    const scoreResp = await fetchAI("google/gemini-2.5-flash-lite", {
      messages: [{ role: "user", content: `Tarot card "${cardName}" in ${position} position. Keywords: ${keywordsStr}. Rate emotional energy 1-5 (1=low, 5=high). Reply with only the number.` }],
    });
    let energyScore = 3;
    if (scoreResp.ok) {
      const sd = await scoreResp.json();
      const p = parseInt(sd.choices?.[0]?.message?.content?.trim());
      if (p >= 1 && p <= 5) energyScore = p;
    }

    // Insert
    const { data: row, error: insertErr } = await supabase.from("tarot_draws").insert({
      user_id: user.id,
      card_id: cardId,
      card_name: cardName,
      is_reversed: isReversed,
      interpretation: `${interpretation}\n\n💡 ${actionTip}`,
      action_tip: actionTip,
      energy_score: energyScore,
      image_path: null,
      image_status: "pending",
    }).select("id").single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save draw" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Async image generation
    const drawId = row.id;
    const imagePrompt = `Create a mystical tarot card illustration for "${cardName}" (${position}). Style: ethereal watercolor with gold accents, dreamy cosmic atmosphere, rich symbolism. The card should evoke ${keywordsStr}. Mystical, elegant, NO TEXT. Square format.`;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const imagePromise = (async () => {
      try {
        const imgResp = await fetch(AI_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3.1-flash-image-preview", messages: [{ role: "user", content: imagePrompt }], modalities: ["image", "text"] }),
        });
        if (!imgResp.ok) { await supabase.from("tarot_draws").update({ image_status: "failed" }).eq("id", drawId); return; }
        const imgData = await imgResp.json();
        const b64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!b64Url) { await supabase.from("tarot_draws").update({ image_status: "failed" }).eq("id", drawId); return; }
        const b64 = b64Url.split(",")[1];
        if (!b64) { await supabase.from("tarot_draws").update({ image_status: "failed" }).eq("id", drawId); return; }
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const fileName = `${user.id}/${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(fileName, bin, { contentType: "image/png", upsert: false });
        if (upErr) { console.error("Upload err:", upErr); await supabase.from("tarot_draws").update({ image_status: "failed" }).eq("id", drawId); return; }
        await supabase.from("tarot_draws").update({ image_path: fileName, image_status: "ready" }).eq("id", drawId);
      } catch (e) { console.error("Image gen err:", e); await supabase.from("tarot_draws").update({ image_status: "failed" }).eq("id", drawId); }
    })();

    try { if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) { (EdgeRuntime as any).waitUntil(imagePromise); } } catch {}

    return new Response(JSON.stringify({
      id: drawId,
      cardId,
      cardName,
      isReversed,
      interpretation: `${interpretation}\n\n💡 ${actionTip}`,
      actionTip,
      energyScore,
      imageUrl: null,
      imageStatus: "pending",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("tarot-draw error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
