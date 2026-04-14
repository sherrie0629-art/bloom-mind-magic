import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

function fetchAI(model: string, requestBody: Record<string, unknown>): Promise<Response> {
  return fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...requestBody, model }) });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    if (action === "monthly-report") return await handleMonthlyReport(supabaseUser, user.id);

    if (action === "check-image") {
      const { whisper_id } = body;
      if (!whisper_id) throw new Error("Missing whisper_id");
      const { data } = await supabaseUser.from("daily_whispers").select("image_url").eq("id", whisper_id).eq("user_id", user.id).single();
      return new Response(JSON.stringify({ imageUrl: data?.image_url || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate whisper
    const { inputText, inputImageBase64, moodEmoji, moodWord, moodScore } = body;
    const whisperContent: any[] = [];
    const moodContext = moodEmoji ? `User selected mood emoji ${moodEmoji}, mood word "${moodWord || ""}", mood score ${moodScore}/5.` : "";

    if (inputImageBase64) {
      whisperContent.push({ type: "image_url", image_url: { url: inputImageBase64 } });
      whisperContent.push({ type: "text", text: `${moodContext}${inputText ? `User's current feeling: "${inputText}". ` : ""}Based on this image, generate a personal whisper for the user. Requirements: poetic, warm, healing, under 40 words. Return only the whisper itself.` });
    } else {
      whisperContent.push({ type: "text", text: `${moodContext}User's current feeling/thought: "${inputText || "Nothing specific"}". Generate a personal daily whisper. Requirements: poetic, warm, healing, under 40 words. Return only the whisper itself.` });
    }

    const whisperResp = await fetchAI("google/gemini-3-flash-preview", {
      messages: [
        { role: "system", content: "You are a wise and warm mindfulness guide who crafts brief, poetic daily affirmations. Your style blends zen wisdom with modern self-care language." },
        { role: "user", content: whisperContent },
      ],
    });
    if (!whisperResp.ok) {
      if (whisperResp.status === 429) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (whisperResp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Whisper generation failed");
    }
    const whisperData = await whisperResp.json();
    const whisper = whisperData.choices?.[0]?.message?.content?.trim() || "It's okay to slow down. That's a kind of gentleness too.";

    const { data: insertedRow, error: insertError } = await supabaseUser.from("daily_whispers").insert({
      user_id: user.id, input_text: inputText || null, whisper, image_url: null,
      mood_emoji: moodEmoji || null, mood_word: moodWord || null, mood_score: moodScore || null,
    }).select("id").single();
    if (insertError) console.error("Insert error:", insertError);
    const whisperId = insertedRow?.id || null;

    const moodDesc = moodWord || inputText || (moodEmoji ? `feeling ${moodEmoji}` : "peaceful contemplation");
    const scoreDesc = moodScore ? moodScore <= 2 ? "melancholic, tender, with gentle comfort" : moodScore <= 3 ? "calm, serene, with quiet introspection" : "warm, hopeful, with gentle joy" : "peaceful and contemplative";
    const imagePrompt = `Create an elegant, healing illustration for someone feeling "${moodDesc}". Mood: ${scoreDesc}. Style: soft dreamy watercolor with gentle light, ethereal atmosphere, warm muted palette. Abstract and poetic. NO TEXT. Square format.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const imagePromise = generateAndSaveImage(LOVABLE_API_KEY, supabaseUser, user.id, whisperId, imagePrompt);
    try { if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) { (EdgeRuntime as any).waitUntil(imagePromise); } } catch {}

    return new Response(JSON.stringify({ whisper, imageUrl: null, whisperId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("daily-whisper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function generateAndSaveImage(apiKey: string, supabase: any, userId: string, whisperId: string | null, imagePrompt: string) {
  try {
    const imageResp = await fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "google/gemini-3.1-flash-image-preview", messages: [{ role: "user", content: imagePrompt }], modalities: ["image", "text"] }) });
    if (!imageResp.ok) { console.error("Image generation failed:", imageResp.status); return; }
    const imageData = await imageResp.json();
    const base64Url = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!base64Url) return;
    const base64Data = base64Url.split(",")[1]; if (!base64Data) return;
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `${userId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from("whisper-images").upload(fileName, binaryData, { contentType: "image/png", upsert: false });
    if (uploadError) { console.error("Upload error:", uploadError); return; }
    const { data: urlData } = supabase.storage.from("whisper-images").getPublicUrl(fileName);
    if (whisperId) { await supabase.from("daily_whispers").update({ image_url: urlData.publicUrl }).eq("id", whisperId); }
  } catch (err) { console.error("Image processing error:", err); }
}

async function handleMonthlyReport(supabaseUser: any, userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: records } = await supabaseUser.from("daily_whispers").select("*").eq("user_id", userId).gte("created_at", startOfMonth).order("created_at", { ascending: true });
  if (!records || records.length === 0) {
    return new Response(JSON.stringify({ error: "No check-ins this month yet. Go log your mood first!" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const summary = records.map((r: any) => {
    const d = new Date(r.created_at);
    return `${d.getMonth() + 1}/${d.getDate()}: ${r.mood_emoji || ""} ${r.mood_word || ""} (score ${r.mood_score || "N/A"}/5) ${r.input_text ? `note: ${r.input_text}` : ""}`;
  }).join("\n");

  const reportResp = await fetchAI("google/gemini-3-flash-preview", {
    messages: [
      { role: "system", content: `You are "Dr. Maya", a deeply empathetic wellness coach. Write a monthly wellness letter to the user. Your style is like a handwritten letter — warm, genuine, and poetic. You should:
1. Acknowledge and celebrate their commitment to tracking their wellness
2. Identify emotional trends (highlights and low points)
3. Show deep empathy for difficult moments
4. Celebrate the good moments sincerely
5. Give 1-2 warm, specific self-care suggestions
Format: Start with "Dear friend," and end with a warm sign-off from Dr. Maya. Keep it 300-500 words.` },
      { role: "user", content: `Here are my mood check-ins this month (${records.length} days):\n${summary}\n\nPlease write my monthly wellness report.` },
    ],
    stream: true,
  });
  if (!reportResp.ok) {
    if (reportResp.status === 429) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (reportResp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error("Report generation failed");
  }
  return new Response(reportResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}
