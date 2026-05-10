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

    // Phase 2: Deep analysis with attachment theory
    if (body.action === "deep-analysis") {
      const { myProfile, partnerProfile, quickResult } = body;
      const deepPrompt = `You are a relationship psychology expert well-versed in attachment theory, love languages, and communication styles.

Based on the following profiles and initial analysis, write a 500-800 word deep relationship analysis.

My info: ${JSON.stringify(myProfile)}
Partner info: ${JSON.stringify(partnerProfile)}
Initial analysis: ${quickResult.overallScore}% compatibility, type "${quickResult.title}", strengths: ${quickResult.strengths.join("; ")}

Include:
1. **Attachment Style Analysis** — Predict each person's likely attachment style (Anxious/Avoidant/Secure/Fearful-Avoidant) and how they interact
2. **Communication Patterns** — How these personalities communicate and potential pitfalls
3. **Long-term Forecast** — Realistic growth trajectory for this relationship
4. **Boundary Navigation** — How to set healthy boundaries with each other

Use therapy-speak naturally. Write in markdown. Warm but professional tone.${langInstr}`;

      const response = await fetchAI("google/gemini-2.5-flash", {
        messages: [{ role: "user", content: deepPrompt }],
        stream: true, max_tokens: 1200,
      });
      if (!response.ok) {
        const t = await response.text(); console.error("Deep analysis error:", response.status, t);
        return new Response(JSON.stringify({ error: "Deep analysis failed" }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Phase 1: Quick structured result — check quota
    const quotaError = await checkAssessmentQuota(req);
    if (quotaError) return quotaError;

    const { myProfile, partnerProfile } = body;
    const systemPrompt = `You are a Gen-Z relationship oracle — half psychologist (attachment theory, love languages), half tarot/anime mystic. Your goal is to make the result FUN to screenshot and share on TikTok / 小红书 / IG. Avoid lecturing. Be vivid, specific, slightly cheeky, never generic. Use the compatibility_result tool to return the result. Respond in the language indicated by LANG below.${langInstr}

STYLE RULES:
- cpName: a poetic 2-6 word "ship name" for them (e.g. "Wind & Moon" / "猫与窗台" / "Sunshine on Static"). Never just their two real names.
- rarity: ONE of "SSR" | "SR" | "R" | "N" — derive from overallScore (>=88 SSR, >=72 SR, >=55 R, else N).
- tags: 3 short punchy chips, each 2-6 words, in the language. e.g. "互补型" / "慢热但上头" / "注定要吵两次" or "opposites attract" / "slow burn" / "destined to argue twice".
- trafficLight: real, specific observations — green=what's working, yellow=watch out, red=danger zone. 1-2 short lines each, no platitudes.
- dramaScene: an 80-120 char mini-scene like a K-drama / 小红书 段子. Concrete time, place, action, one line of inner thought. NO names, use "你" / "TA" or "you" / "them".
- loveLanguage.actionForThem: one concrete physical thing the user can do this week (under 30 chars).
- loveLanguage.phraseTheyWant: ONE exact sentence in quotes the partner secretly wants to hear.
- keywords: 3 future-tense words/phrases (e.g. "旅行 / 误会 / 二次确认").
- prophecy: ONE single-sentence playful prediction with a time hint (e.g. "立秋之前，你们会有一次重要的对话。").
- socialCaption: one screenshot-worthy line, 15-30 chars, ending with an emoji.`;
    const userContent = `Me: ${JSON.stringify(myProfile)}\nPartner: ${JSON.stringify(partnerProfile)}\nGenerate the CP card.`;

    const tools = [{
      type: "function",
      function: {
        name: "compatibility_result",
        description: "Return relationship chemistry analysis result",
        parameters: {
          type: "object",
          properties: {
            overallScore: { type: "number", description: "Overall compatibility percentage (0-100)" },
            title: { type: "string", description: "Relationship title, e.g. 'Soul Resonators'" },
            cpName: { type: "string", description: "Poetic ship name, 2-6 words" },
            rarity: { type: "string", enum: ["SSR", "SR", "R", "N"] },
            tags: { type: "array", items: { type: "string" }, description: "Exactly 3 punchy chip tags" },
            emoji: { type: "string" },
            summary: { type: "string", description: "60 words or less relationship overview" },
            dimensions: { type: "object", description: "Each is an INTEGER 0-100. 五维要有差异：最高 75-95，最低 40-60。严禁全部低于 20。", properties: { emotional: { type: "number", description: "Integer 0-100" }, communication: { type: "number", description: "Integer 0-100" }, values: { type: "number", description: "Integer 0-100" }, growth: { type: "number", description: "Integer 0-100" }, chemistry: { type: "number", description: "Integer 0-100" } }, required: ["emotional", "communication", "values", "growth", "chemistry"] },
            radarOneLiner: { type: "string", description: "One sentence summing up the radar shape, under 40 chars" },
            strengths: { type: "array", items: { type: "string" }, description: "3-4 relationship strengths, 20 words each max" },
            conflicts: { type: "array", items: { type: "object", properties: { issue: { type: "string" }, solution: { type: "string" } }, required: ["issue", "solution"] }, description: "2 potential conflicts with solutions" },
            trafficLight: {
              type: "object",
              properties: {
                green: { type: "array", items: { type: "string" }, description: "1-2 things working" },
                yellow: { type: "array", items: { type: "string" }, description: "1-2 things to watch" },
                red: { type: "array", items: { type: "string" }, description: "1-2 danger zones" },
              },
              required: ["green", "yellow", "red"],
            },
            dramaScene: { type: "string", description: "80-120 char mini K-drama scene" },
            loveLanguage: {
              type: "object",
              properties: {
                mine: { type: "string" },
                partner: { type: "string" },
                tip: { type: "string", description: "Love language advice under 50 words" },
                actionForThem: { type: "string", description: "One concrete physical action this week, under 30 chars" },
                phraseTheyWant: { type: "string", description: "ONE quoted sentence the partner secretly wants to hear" },
              },
              required: ["mine", "partner", "tip", "actionForThem", "phraseTheyWant"],
            },
            keywords: { type: "array", items: { type: "string" }, description: "Exactly 3 future-tense keywords" },
            prophecy: { type: "string", description: "ONE single-sentence playful prediction with a time hint" },
            socialCaption: { type: "string" },
          },
          required: ["overallScore", "title", "cpName", "rarity", "tags", "emoji", "summary", "dimensions", "radarOneLiner", "strengths", "conflicts", "trafficLight", "dramaScene", "loveLanguage", "keywords", "prophecy", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI("google/gemini-2.5-flash", {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      tools, tool_choice: { type: "function", function: { name: "compatibility_result" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests 🌙" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted 💫" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service unavailable");
    }
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI returned no valid result");
    return new Response(JSON.stringify({ result: JSON.parse(toolCall.function.arguments) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("assessment-compatibility error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
