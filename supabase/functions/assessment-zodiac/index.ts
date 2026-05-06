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
      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `You are a professional Western astrologer. The user's zodiac sign is: ${body.zodiacSign || "unknown"}.
Generate 10 questions about their current life situation, feelings, and energy to personalize their horoscope reading.
Cover overall energy, love life, career, and finances. Make them fun and relatable. Each has 4 options (A/B/C/D). Respond in the language indicated by LANG below.
Consider current astrological themes like Mercury Retrograde, eclipse seasons, etc.
You must call the batch_questions tool.` },
          { role: "user", content: "Generate 10 horoscope reading questions." },
        ],
        tools: [{ type: "function" as const, function: { name: "batch_questions", description: "Return 10 horoscope questions", parameters: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"] } }, dimension: { type: "string", description: "Aspect: overall/love/career/fortune" } }, required: ["question", "options", "dimension"] }, minItems: 10, maxItems: 10 } }, required: ["questions"] } } }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.7, max_tokens: 2048,
      });
      if (!response.ok) { const t = await response.text(); console.error("Batch error:", response.status, t); throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call");
      return new Response(JSON.stringify({ type: "batch", data: JSON.parse(toolCall.function.arguments).questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Result mode — check quota
    const quotaError = await checkAssessmentQuota(req);
    if (quotaError) return quotaError;

    const { history, zodiacSign } = body;
    const systemPrompt = `You are a professional Western astrologer. The user's sign is: ${zodiacSign || "unknown"}.
Based on their sign and answers, generate a detailed horoscope reading using Western astrology terminology (Rising sign, Moon sign, Mercury Retrograde, eclipse seasons, etc.).
Do NOT use Chinese astrology concepts. Use Element (Fire/Earth/Air/Water) instead of Chinese elements.
Respond in the language indicated by LANG below. You must call the zodiac_result tool.`;

    const response = await fetchAI(model, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Q&A:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nGenerate horoscope reading.` }],
      tools: [{ type: "function" as const, function: { name: "zodiac_result", description: "Return horoscope reading result", parameters: { type: "object", properties: {
        zodiacSign: { type: "string" }, element: { type: "string", description: "Element: Fire/Earth/Air/Water" },
        title: { type: "string", description: "Reading theme, e.g. 'Season of Renewal'" },
        description: { type: "string", description: "~200 word personalized horoscope reading" },
        traits: { type: "object", properties: { overall: { type: "number" }, love: { type: "number" }, career: { type: "number" }, fortune: { type: "number" } }, required: ["overall", "love", "career", "fortune"] },
        luckyItems: { type: "object", properties: { color: { type: "string" }, number: { type: "string" }, direction: { type: "string" } }, required: ["color", "number", "direction"] },
        advice: { type: "string", description: "This week's advice under 50 words" },
        socialCaption: { type: "string", description: "Fun shareable caption under 30 words" },
      }, required: ["zodiacSign", "element", "title", "description", "traits", "luckyItems", "advice", "socialCaption"] } } }],
      tool_choice: { type: "function" as const, function: { name: "zodiac_result" } },
      temperature: 0.7, max_tokens: 1024,
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
