import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

const FREE_DAILY_ASSESS = 5;
const PLUS_DAILY_ASSESS = 20;

async function checkAssessmentQuota(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  if (!token || token === Deno.env.get("SUPABASE_ANON_KEY")) return null;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: claimsData, error } = await supabase.auth.getClaims(token);
  if (error || !claimsData?.claims?.sub) return null;
  const userId = claimsData.claims.sub as string;
  const authedClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader! } } });
  const { data: sub } = await authedClient.from("user_subscriptions").select("plan, expires_at").eq("user_id", userId).single();
  const isPlus = sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at) > new Date();
  const dailyLimit = isPlus ? PLUS_DAILY_ASSESS : FREE_DAILY_ASSESS;
  const today = new Date().toISOString().split("T")[0];
  const { data: usage } = await authedClient.from("usage_tracking").select("id, assessment_count").eq("user_id", userId).eq("track_date", today).single();
  const currentCount = usage?.assessment_count || 0;
  if (currentCount >= dailyLimit) {
    return new Response(JSON.stringify({ error: `Daily assessment limit reached (${dailyLimit}/day). ${isPlus ? "Come back tomorrow!" : "Upgrade to Plus for more!"} 🌙` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (usage) { await authedClient.from("usage_tracking").update({ assessment_count: currentCount + 1 }).eq("id", usage.id); }
  else { await authedClient.from("usage_tracking").insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 1, deep_report_count: 0 }); }
  return null;
}

function fetchAI(model: string, requestBody: Record<string, unknown>): Promise<Response> {
  return fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...requestBody, model }) });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const locale = body.locale || "en";
    const langInstr = locale === "zh" ? "\nLANG: Respond entirely in Simplified Chinese (简体中文). All field values, descriptions, captions must be Chinese." : "\nLANG: Respond entirely in natural English.";
    const model = "google/gemini-2.5-flash-lite";

    if (body.action === "batch-questions") {
      // ISO week key — cache refreshes weekly
      const now = new Date();
      const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()));
      const weekKey = weekStart.toISOString().split("T")[0];
      const sign = (body.zodiacSign || "unknown").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
      const PROMPT_VERSION = "v2"; // bump to invalidate stale cached questions
      const cachePath = `zodiac-questions/${sign}-${locale}-${weekKey}-${PROMPT_VERSION}.json`;

      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // Try cache first
      try {
        const { data: cached } = await admin.storage.from("assessment-cache").download(cachePath);
        if (cached) {
          const text = await cached.text();
          const questions = JSON.parse(text);
          if (Array.isArray(questions) && questions.length >= 10) {
            return new Response(JSON.stringify({ type: "batch", data: questions, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch (_) { /* cache miss */ }

      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `Western astrologer. Sign: ${body.zodiacSign || "unknown"}.
Generate 10 fun, relatable horoscope questions covering overall energy, love, career, finances. Each has 4 options (A/B/C/D).${langInstr}
Call the batch_questions tool.` },
          { role: "user", content: "Generate 10 horoscope questions." },
        ],
        tools: [{ type: "function" as const, function: { name: "batch_questions", description: "Return 10 horoscope questions", parameters: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"] } }, dimension: { type: "string", description: "Aspect: overall/love/career/fortune" } }, required: ["question", "options", "dimension"] }, minItems: 10, maxItems: 10 } }, required: ["questions"] } } }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.5, max_tokens: 1200,
      });
      if (!response.ok) { const t = await response.text(); console.error("Batch error:", response.status, t); throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call");
      const questions = JSON.parse(toolCall.function.arguments).questions;

      // Write cache (fire and forget)
      try {
        await admin.storage.from("assessment-cache").upload(
          cachePath,
          new Blob([JSON.stringify(questions)], { type: "application/json" }),
          { upsert: true, contentType: "application/json" },
        );
      } catch (e) { console.error("cache write failed:", e); }

      return new Response(JSON.stringify({ type: "batch", data: questions, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Result mode — check quota
    const quotaError = await checkAssessmentQuota(req);
    if (quotaError) return quotaError;

    const { history, zodiacSign } = body;
    const systemPrompt = `You are a professional Western astrologer with the warm, witty voice of a mystical best friend. The user's sign is: ${zodiacSign || "unknown"}.
Based on their sign and answers, generate a detailed horoscope reading using Western astrology terminology (Rising sign, Moon sign, Mercury Retrograde, eclipse seasons, etc.).
Do NOT use Chinese astrology concepts. Use Element (Fire/Earth/Air/Water) instead of Chinese elements.
The "advice" object MUST be rich, playful, specific and slightly mystical — never generic. Each item should feel like a tiny secret only this user gets.
Respond in the language indicated by LANG below. You must call the zodiac_result tool.${langInstr}`;

    const response = await fetchAI(model, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Q&A:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nGenerate horoscope reading.` }],
      tools: [{ type: "function" as const, function: { name: "zodiac_result", description: "Return horoscope reading result", parameters: { type: "object", properties: {
        zodiacSign: { type: "string" }, element: { type: "string", description: "Element: Fire/Earth/Air/Water" },
        title: { type: "string", description: "Reading theme, e.g. 'Season of Renewal'" },
        description: { type: "string", description: "~200 word personalized horoscope reading" },
        traits: { type: "object", properties: { overall: { type: "number" }, love: { type: "number" }, career: { type: "number" }, fortune: { type: "number" } }, required: ["overall", "love", "career", "fortune"] },
        luckyItems: { type: "object", properties: { color: { type: "string" }, number: { type: "string" }, direction: { type: "string" } }, required: ["color", "number", "direction"] },
        advice: {
          type: "object",
          description: "Rich, playful weekly guidance — like a mystical best friend whispering in the user's ear. Each text field MUST start with a fitting emoji.",
          properties: {
            mantra: { type: "string", description: "Poetic weekly energy mantra, ≤20 chars (zh) / ≤8 words (en). No emoji." },
            doThis: { type: "array", minItems: 3, maxItems: 3, items: { type: "string", description: "Action tip starting with emoji, 15-30 chars. Cover action / social / self-care." } },
            avoidThis: { type: "array", minItems: 2, maxItems: 2, items: { type: "string", description: "Playful warning starting with emoji, ≤20 chars." } },
            luckyMoment: { type: "string", description: "Lucky time window + one-line interpretation, e.g. '🌙 周三傍晚 5-7 点｜灵感会悄悄敲门'." },
            crystalOrRitual: { type: "string", description: "A crystal, scent, or tiny ritual + how to use it in one line, starting with emoji." },
          },
          required: ["mantra", "doThis", "avoidThis", "luckyMoment", "crystalOrRitual"],
        },
        socialCaption: { type: "string", description: "Fun shareable caption under 30 words" },
      }, required: ["zodiacSign", "element", "title", "description", "traits", "luckyItems", "advice", "socialCaption"] } } }],
      tool_choice: { type: "function" as const, function: { name: "zodiac_result" } },
      temperature: 0.8, max_tokens: 1400,
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service error");
    }
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    return new Response(JSON.stringify({ type: "result", data: JSON.parse(toolCall.function.arguments) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("zodiac error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
