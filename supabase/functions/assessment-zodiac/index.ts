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
  if (usage) { await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!).from("usage_tracking").update({ assessment_count: currentCount + 1 }).eq("id", usage.id); }
  else { await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!).from("usage_tracking").insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 1, deep_report_count: 0 }); }
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
      const PROMPT_VERSION = "v3"; // bump to invalidate stale cached questions
      // N variants per (sign, locale, week); client rotates per user.
      const VARIANT_COUNT = 5;
      const rawVariant = Number.isFinite(Number(body.variant)) ? Math.floor(Number(body.variant)) : Math.floor(Math.random() * VARIANT_COUNT);
      const variant = ((rawVariant % VARIANT_COUNT) + VARIANT_COUNT) % VARIANT_COUNT;
      const cachePath = `zodiac-questions/${sign}-${locale}-${weekKey}-${PROMPT_VERSION}-v${variant}.json`;

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

      const zhSystem = `你是一位会占卜的"损友"，正在带朋友玩一场轻松的心理小测验。星座：${body.zodiacSign || "未知"}。
出 10 道题，覆盖 综合能量 / 爱情 / 事业 / 财运（每个维度 2-3 题），但不要直白点题，用具体生活场景包装。

【硬性要求】
1. 每题是一个具体小场景 + "你的反应/选择/脑内小剧场"。例如：
   - "周五晚上手机突然弹出前任的朋友圈，你的第一反应是？"
   - "工位上的多肉今早莫名歪了，你心想……"
   - "老板群里发了个意味不明的'嗯'，你脑补的下一句是？"
2. 4 个选项每个 8-20 字，要有画面感/情绪/自嘲/玄学梗，例如"装作没看见，但已经截图发闺蜜"。
3. 严禁出现纯形容词选项（如"开心/难过/平静/焦虑"），严禁"你认为/你觉得/你的 X 如何"开头超过 2 题。
4. 语气像小红书占卜博主，俏皮但不油腻，emoji 最多每题 1 个，可不用。
5. 必须调用 batch_questions 工具返回。`;

      const enSystem = `You are a witty psychic best friend running a playful personality quiz. Sign: ${body.zodiacSign || "unknown"}.
Write 10 questions covering overall vibe / love / career / money (2-3 each), wrapped in vivid everyday micro-scenes — never name the dimension out loud.

[Rules]
1. Each question is a tiny scene + "your reaction/inner monologue", e.g.:
   - "Your ex's story pops up at 11:47pm. First instinct?"
   - "Boss replies just 'k' in the group chat. Your brain immediately…"
2. Each of 4 options is 8-20 words, with imagery, emotion, self-deprecation or cosmic humor (e.g. "Pretend I didn't see it. Already screenshot to bestie though.").
3. No bare adjective options ("Happy / Sad / Calm"). No more than 2 questions starting with "Do you think / How do you feel".
4. Voice = Co-Star meets group-chat oracle. Max 1 emoji per question, optional.
5. Must call batch_questions.`;

      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: (locale === "zh" ? zhSystem : enSystem) + langInstr },
          { role: "user", content: (locale === "zh" ? "出 10 道场景化星座小测验题。" : "Generate 10 scene-based horoscope quiz questions.") + (locale === "zh" ? `\n\n本套编号：#${variant + 1}（共 ${VARIANT_COUNT} 套）。请使用与其他编号截然不同的场景与措辞，5 套之间无重复题目。` : `\n\nVariant #${variant + 1} of ${VARIANT_COUNT}. Use scenes and phrasing clearly different from the other variants — no overlapping questions.`) },
        ],
        tools: [{ type: "function" as const, function: { name: "batch_questions", description: "Return 10 scene-based horoscope quiz questions", parameters: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { question: { type: "string", description: "A vivid everyday micro-scene + the user's reaction. NOT an abstract feeling question." }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string", description: "8-20 chars, concrete and visual, with emotion/humor/self-deprecation. Never a bare adjective." } }, required: ["label", "text"] } }, dimension: { type: "string", description: "Aspect: overall/love/career/fortune" } }, required: ["question", "options", "dimension"] }, minItems: 10, maxItems: 10 } }, required: ["questions"] } } }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.85, max_tokens: 1500,
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
        traits: { type: "object", description: "Each is an INTEGER 0-100. 让运势分布有起伏：最旺维 75-95，最弱维 35-55。严禁全部低于 20。", properties: { overall: { type: "number", description: "Integer 0-100, typically 50-92" }, love: { type: "number", description: "Integer 0-100, typically 35-92" }, career: { type: "number", description: "Integer 0-100, typically 35-92" }, fortune: { type: "number", description: "Integer 0-100, typically 35-92" } }, required: ["overall", "love", "career", "fortune"] },
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
