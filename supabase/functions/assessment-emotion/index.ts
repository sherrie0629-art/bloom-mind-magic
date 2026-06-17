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
  const isPlus = true; // payments removed — all users treated as plus
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
    const _authHeader = req.headers.get("Authorization");
    const _authToken = _authHeader?.startsWith("Bearer ") ? _authHeader.replace("Bearer ", "") : null;
    if (!_authToken || _authToken === Deno.env.get("SUPABASE_ANON_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    {
      const _ac = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: _cl, error: _ce } = await _ac.auth.getClaims(_authToken);
      if (_ce || !_cl?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    const body = await req.json();
    const locale = body.locale || "en";
    const langInstr = locale === "zh" ? "\nLANG: Respond entirely in Simplified Chinese (简体中文). All field values, descriptions must be Chinese." : "\nLANG: Respond entirely in natural English.";
    const model = "google/gemini-2.5-flash-lite";

    const QUESTIONS_PROMPT_VERSION = "v2";

    if (body.action === "batch-questions") {
      const styleZh = `你是「懂心理学的损友」，正在帮朋友做一个心灵体检小测试。风格像小红书 emo 博主 + 深夜电台主播，不是问卷量表。

【题目硬要求】
- 共 10 题，维度分布：burnout 3 / energy 2 / boundaries 2 / sleep 2 / regulation 1
- 每道题必须是「具体生活切片」：有时间、地点、动作细节，让人秒对号入座
  ✅ 正例：「凌晨 1 点你已经躺下了，但还在刷一个完全不感兴趣的短视频，这一刻你心里在想……」
  ✅ 正例:「同事在群里 @你"在吗"，距离下班还有 10 分钟，你身体的第一反应是……」
  ❌ 反例：「你最近睡眠如何？」「你是否经常感到疲惫？」
- 题干 ≥25 字，第二人称，全场最多 1 个 emoji 出现在题干里
- 禁止「你是否…」「您觉得…」开头超过 2 题
- 4 个选项 A/B/C/D，每个 10–22 字，写「具体动作 / 内心独白」
  ✅「假装没看见，先去倒杯水拖 5 分钟」
  ✅「秒回'在的~'，然后心里咯噔一下」
  ❌「经常」「有时」「很少」「从不」这种程度副词一律禁止
- 选项之间要拉开差距，覆盖不同应对模式（迎合 / 回避 / 直球 / 内耗）

【few-shot 范例 - boundaries 维度】
{"question":"周日晚上 11 点，老板在微信发了一句"明天能不能早点到？"，你盯着屏幕……","options":[{"label":"A","text":"秒回"好的没问题"，然后失眠到 2 点"},{"label":"B","text":"故意 20 分钟后回，假装在忙"},{"label":"C","text":"直接问"几点算早？有什么事吗？""},{"label":"D","text":"已读不回，明天正常时间到"}],"dimension":"boundaries"}

调用 batch_questions 工具返回。version=${QUESTIONS_PROMPT_VERSION}`;

      const styleEn = `You are a witty therapist-friend running a wellness vibe check, not a clinical survey. Tone: Co-Star push notification meets group-chat best friend.

[Hard rules]
- 10 questions total. Dimension mix: burnout 3 / energy 2 / boundaries 2 / sleep 2 / regulation 1
- Every question is a CONCRETE LIFE MOMENT with time / place / action so the user instantly recognizes themselves
  Good: "It's 1am, you're in bed but still scrolling videos you don't even care about. The voice in your head is saying..."
  Good: "A coworker DMs 'you free?' with 10 minutes left in your workday. Your body's first reaction is..."
  Bad: "How is your sleep lately?" / "Do you often feel tired?"
- Question stem >=20 words, second person, max 1 emoji per stem total across the set
- No more than 2 questions may open with "Do you..." / "How often..."
- 4 options A/B/C/D, each 8-18 words, describing a SPECIFIC action or inner monologue
  Good: "Reply 'sure!' instantly, then resent it for the next hour"
  Bad: "Often" / "Sometimes" / "Rarely" / "Never" — banned
- Options should span different coping styles (please / avoid / direct / shut-down)

Call the batch_questions tool. version=${QUESTIONS_PROMPT_VERSION}`;

      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `${locale === "zh" ? styleZh : styleEn}${langInstr}` },
          { role: "user", content: locale === "zh" ? "出 10 道有画面感的心灵体检题。" : "Generate 10 vivid wellness check questions." },
        ],
        tools: [{ type: "function" as const, function: { name: "batch_questions", description: "Return 10 vivid scene-based wellness questions", parameters: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { question: { type: "string", description: "Concrete life scene in 2nd person, >=25 chars (zh) / >=20 words (en), with time/place/action detail. No abstract survey phrasing." }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string", description: "Specific action or inner monologue, 10-22 chars (zh) / 8-18 words (en). NO frequency adverbs like often/sometimes." } }, required: ["label", "text"] } }, dimension: { type: "string", description: "burnout / energy / boundaries / sleep / regulation" } }, required: ["question", "options", "dimension"] }, minItems: 10, maxItems: 10 } }, required: ["questions"] } } }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.9, max_tokens: 2048,
      });
      if (!response.ok) { throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call");
      return new Response(JSON.stringify({ type: "batch", data: JSON.parse(toolCall.function.arguments).questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Result mode — check quota
    const quotaError = await checkAssessmentQuota(req);
    if (quotaError) return quotaError;

    const { history } = body;
    const systemPrompt = `You are a professional wellness coach. Based on the user's answers, assess their current burnout and wellness state.
Use therapy-speak naturally: "boundaries", "emotional labor", "self-care", "holding space", "validation".
Be warm, supportive, and professional. If you notice signs of serious mental health concerns, gently suggest professional help.
Respond in the language indicated by LANG below. Call emotion_result tool.${langInstr}`;

    // Use a stronger model for structured tool calling — flash-lite is unreliable here
    const resultModel = "google/gemini-2.5-flash";
    const callResult = (m: string) => fetchAI(m, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Q&A:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nAssess wellness state.` }],
      tools: [{ type: "function" as const, function: { name: "emotion_result", description: "Return wellness assessment result", parameters: { type: "object", properties: {
        emotionLevel: { type: "string", description: "Wellness level: Thriving/Balanced/Coasting/Running Low/Burnout Zone" },
        emoji: { type: "string" },
        title: { type: "string", description: "Title like 'Your Inner Fire is Strong' or 'Time to Recharge'" },
        description: { type: "string", description: "~200 word personalized wellness analysis, warm and encouraging" },
        traits: { type: "object", description: "Each is an INTEGER 0-100. 强弱差异要明显：典型最高维 70-92，最低维 30-55。严禁全部维度都低于 20。", properties: { burnout: { type: "number", description: "Burnout level, integer 0-100 (lower is better)" }, energy: { type: "number", description: "Integer 0-100, typically 30-92" }, boundaries: { type: "number", description: "Integer 0-100, typically 30-92" }, sleep: { type: "number", description: "Integer 0-100, typically 30-92" } }, required: ["burnout", "energy", "boundaries", "sleep"] },
        suggestions: { type: "array", items: { type: "string" }, description: "3 actionable self-care suggestions" },
        socialCaption: { type: "string", description: "Warm shareable caption under 30 words" },
      }, required: ["emotionLevel", "emoji", "title", "description", "traits", "suggestions", "socialCaption"] } } }],
      tool_choice: { type: "function" as const, function: { name: "emotion_result" } },
      temperature: 0.7, max_tokens: 1024,
    });

    let response = await callResult(resultModel);
    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service error");
    }
    let data = await response.json();
    let toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.warn("No tool call from", resultModel, "— retrying with gemini-2.5-pro. Raw:", JSON.stringify(data).slice(0, 500));
      response = await callResult("google/gemini-2.5-pro");
      if (response.ok) {
        data = await response.json();
        toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      }
    }
    if (!toolCall) throw new Error("No tool call");
    return new Response(JSON.stringify({ type: "result", data: JSON.parse(toolCall.function.arguments) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("emotion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
