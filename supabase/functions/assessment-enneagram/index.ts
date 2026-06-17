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
    const langInstr = locale === "zh" ? "\nLANG: Respond entirely in Simplified Chinese (简体中文). All field values, descriptions, captions must be Chinese." : "\nLANG: Respond entirely in natural English.";
    const model = "google/gemini-2.5-flash-lite";

    if (body.action === "batch-questions") {
      const PROMPT_VERSION = "v2";
      const systemZh = `PROMPT_VERSION: ${PROMPT_VERSION}
你是个懂九型人格的损友，正在陪朋友做一份"心理小剧场"测验。不是教科书，不要学术腔。

【目标】
出 10 道题，从用户在具体生活场景里的**第一反应**反推九型人格类型(1-9)。

【九型核心动机速记，分配选项时参考】
1完美/对错  2付出/被需要  3成就/被认可  4独特/真我  5知识/独立
6安全/忠诚  7快乐/避痛  8掌控/力量  9和谐/避冲突

【题目硬要求】
- 每题必须是一个**具体生活小情境**(>=25 字)，让用户选第一反应。例如:
  · "项目临近 deadline，队友交来一份明显不达标的稿，你脑子里第一句话是…"
  · "刷到前同事升职的朋友圈，你停顿了 3 秒，心里其实在…"
  · "深夜失眠，反复在脑子里循环播放的通常是…"
- 4 个选项每条 10–22 字，必须是**具体动作或内心独白**，最好分别对应不同九型类型的典型反应。
  · 好例:"默默重写一遍，顺便列张'下次注意'清单"
  · 坏例:"我会很冷静"(纯形容词，禁止)
- 10 道题里，type 1–9 的典型反应都至少要在某个选项里出现一次。
- 维度分布:motivation 3 题 / fear 2 题 / relationship 2 题 / stress 2 题 / growth 1 题。
- 语气像小红书博主带点损友吐槽，emoji 整套题最多用 1 个。
- 禁止:"你认为/你觉得/你的…如何"开头超过 2 题；禁止纯形容词选项；禁止直接点明"这是测你的恐惧/动机"。

【风格示例(参考，不要照抄)】
Q: "周五加班到 10 点，老板群里发了个意味不明的'嗯'，你脑内小剧场是…"
A. "完了是不是哪里做错了，翻聊天记录复盘"  (6 号)
B. "他累了懒得打字吧，明天再说"  (9 号)
C. "管他什么意思，先把活干完证明给他看"  (3 号)
D. "想这么多干嘛，下班！周末计划要紧"  (7 号)

必须调用 batch_questions 工具返回 10 题。`;
      const systemEn = `PROMPT_VERSION: ${PROMPT_VERSION}
You are a witty friend who knows the Enneagram, running a "inner-monologue mini quiz" for a friend. Not a textbook—no academic tone.

GOAL: 10 questions that infer the user's Enneagram type (1-9) from their **first reaction** to specific life scenes.

ENNEAGRAM CORE MOTIVES (use when crafting options):
1 perfection  2 being needed  3 achievement  4 being unique  5 knowledge
6 security  7 pleasure/avoid pain  8 control  9 harmony

HARD RULES:
- Every question is a **concrete tiny scene** (>=20 words). Ask for the user's first reaction.
- 4 options, each 8–18 words, must be a **specific action or inner thought** mapped to a distinct type.
  · Good: "Quietly rewrite it and draft a 'lessons learned' note."
  · Bad: "I'd stay calm." (pure adjective—forbidden)
- Across 10 questions, cover all 9 types at least once via the options.
- Dimension mix: motivation 3 / fear 2 / relationship 2 / stress 2 / growth 1.
- Tone like Co-Star—dry, clever, slightly self-aware. At most 1 emoji across the whole set.
- Forbidden: more than 2 questions starting with "Do you / How would you…"; pure adjective options; revealing what the question measures.

STYLE EXAMPLE:
Q: "Friday 10pm, your boss drops a vague 'hm' in the group chat. Your brain immediately…"
A. "Scrolls up to check what I might've done wrong."  (6)
B. "Assumes they're tired—deal with it tomorrow."  (9)
C. "Doubles down on finishing the work to prove myself."  (3)
D. "Stop overthinking. Weekend plans matter more."  (7)

You MUST call the batch_questions tool with all 10 questions.`;
      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: locale === "zh" ? systemZh : systemEn },
          { role: "user", content: locale === "zh" ? "出 10 道场景化的九型人格测试题。" : "Generate 10 scenario-based Enneagram questions." },
        ],
        tools: [{ type: "function" as const, function: { name: "batch_questions", description: "Return 10 scenario-based Enneagram questions", parameters: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { question: { type: "string", description: "A concrete life scenario asking for the user's first reaction. Min 25 chars (zh) / 20 words (en). No abstract framing." }, options: { type: "array", items: { type: "object", properties: { label: { type: "string", description: "A / B / C / D" }, text: { type: "string", description: "Specific action or inner monologue, 10-22 chars (zh) / 8-18 words (en). NO pure adjectives." } }, required: ["label", "text"] }, minItems: 4, maxItems: 4 }, dimension: { type: "string", description: "One of: motivation | fear | relationship | stress | growth" } }, required: ["question", "options", "dimension"] }, minItems: 10, maxItems: 10 } }, required: ["questions"] } } }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.9, max_tokens: 2048,
      });
      if (!response.ok) { const t = await response.text(); console.error("Batch error:", response.status, t); throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call");
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ type: "batch", data: args.questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Result mode — check quota
    const quotaError = await checkAssessmentQuota(req);
    if (quotaError) return quotaError;

    const { history } = body;
    const RESULT_PROMPT_VERSION = "v4";
    const systemPrompt = `RESULT_PROMPT_VERSION: ${RESULT_PROMPT_VERSION}
你是个懂九型的损友 / 心理博主，正在给朋友写一份"她会截图发朋友圈"的测评结果。不是教科书，不是星座号，是会让人笑着说"靠这就是我"的那种。

【风格】
- 中文像小红书 MBTI 博主 + 一点损友吐槽；英文像 Co-Star 推送
- 全文最多 2 个 emoji，禁止排比说教
- 第二人称，禁止"你是一个 XX 的人"这种盖章式开头
- 每个字段都要有画面感 / 具体动作 / 内心独白，杜绝"你害怕被否定""你应该学会爱自己"这种空话

【字段要求】
- description (~200 字)：前两句必须是"你大概率有过这个瞬间"的具体画面（凌晨 2 点改 PPT、群里被 @ 心跳加速…），中间解释类型动机，结尾给一句温柔锐评
- wingExplanation (40–70 字)：用一句生活化的话解释"主类型 w 侧翼"组合带来的味道差异，必须含具体场景 / 行为对比。禁止"侧翼是相邻类型对主类型的影响""融合了 X 与 Y 的特质"这种定义腔。例："1w2 的你是带着热心肠的完美主义——会一边帮同事改方案到凌晨，一边在心里默默给他扣 3 分。"
- coreFear / coreDesire (10–20 字)：画面化短句。例如不要"害怕失控"，要"被人发现你其实在硬撑的那一秒"
- growthPath (60–100 字)：1 个本周可执行小动作 + 1 句温柔提醒；禁止"你应该学会..."句式
- stressArrow (60–100 字)：压力下你会做的具体行为（突然拉黑、熬夜刷购物车、给所有人发"在吗"…），带一点自嘲
- advice (50–80 字)：像闺蜜在 24h 便利店递关东煮时随口说的话。硬性要求：① 必须有 1 个具体小动作或场景（楼下便利店买热奶茶 / 把手机调飞行模式 30 分钟 / 把没回的群消息全标已读…）；② 可以带 1 个 emoji；③ 允许俏皮、自嘲、轻吐槽；④ **禁止**以"建议你""你应该""你需要""记住"开头；⑤ **禁用**"保持初心""坚持自我""学会爱自己""相信自己""做最好的自己"这类鸡汤短语
- socialCaption (≤30 字)：小红书标题感，可带反转或 hashtag

【中文 few-shot - Type 4 风格示例】
description 开头："你大概率有过这种瞬间——朋友说'你最近挺好的吧'，你笑着点头，回家把同一首歌单曲循环 47 遍。你不是矫情，你只是觉得，被理解这件事比想象中稀有。"
wingExplanation 示例："4w5 的你是会把情绪写成观察日记的那种——别人哭完发朋友圈，你哭完先研究自己'为什么哭'，再分三段写成小作文存草稿箱。"
advice 示例 1："今晚关掉那 17 个待办 ☕ 楼下便利店买根烤肠，边走边骂老板两句，回家直接躺平——你真的不是机器，地球今晚没你照样转。"
advice 示例 2："明天上班路上听首土到爆的口水歌 🎧 别再循环那首'懂我的人'了。情绪也需要换季，不然真的会发霉。"
stressArrow："压力上头时你会突然清空购物车、把头像换成黑色、给三个月没联系的人发'在吗'，然后秒删。睡前还要给自己写 800 字内心独白当存档。"

${langInstr}
必须调用 enneagram_result 工具返回结果。`;
    const userContent = `Here is the user's Q&A history:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nAnalyze the Enneagram type. 严格按字段要求生成，不准回退到教科书腔。`;

    const response = await fetchAI(model, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      tools: [{ type: "function" as const, function: { name: "enneagram_result", description: "Return Enneagram analysis result with vivid, scene-based language", parameters: { type: "object", properties: {
        type: { type: "number", description: "Enneagram type 1-9" },
        wing: { type: "string", description: "Wing, e.g. '4w5' or '7w6'" },
        wingExplanation: { type: "string", description: "40-70 字 / 30-60 words. 用一句生活化的话解释主类型 w 侧翼组合带来的味道差异，必须含具体场景或行为对比。禁止'侧翼是相邻类型对主类型的影响''融合了 X 与 Y 的特质'这类定义腔。例：'1w2 的你是带着热心肠的完美主义——会一边帮同事改方案到凌晨，一边在心里默默给他扣 3 分。'" },
        title: { type: "string", description: "Type name, e.g. 'The Reformer', 'The Helper'" },
        coreFear: { type: "string", description: "10-20 字 / 8-15 words. 画面化短句，禁止抽象定义。例：'被人发现你其实在硬撑的那一秒'" },
        coreDesire: { type: "string", description: "10-20 字 / 8-15 words. 画面化短句，禁止抽象定义" },
        description: { type: "string", description: "~200 字 / ~180 words. 第二人称，前两句必须是具体生活画面（你大概率有过这种瞬间...），中段解释动机，结尾一句温柔锐评。禁止'你是一个 XX 的人'开头" },
        traits: { type: "object", description: "Trait scores. Each is an INTEGER 0-100. 真实分布要有说服力：最高维通常 75-92，中间维 55-75，最低维 35-55。严禁所有维度都集中在 0-20 区间。", properties: { selfAwareness: { type: "number", description: "Integer 0-100, typically 35-92" }, empathy: { type: "number", description: "Integer 0-100, typically 35-92" }, resilience: { type: "number", description: "Integer 0-100, typically 35-92" }, growth: { type: "number", description: "Integer 0-100, typically 35-92" } }, required: ["selfAwareness", "empathy", "resilience", "growth"] },
        growthPath: { type: "string", description: "60-100 字 / 50-90 words. 给 1 个本周可执行小动作 + 1 句温柔提醒。禁止'你应该学会...'句式" },
        stressArrow: { type: "string", description: "60-100 字 / 50-90 words. 描述压力下的具体行为（拉黑、熬夜刷手机、突然清空购物车…），带一点自嘲" },
        advice: { type: "string", description: "50-80 字 / 40-70 words. 闺蜜在 24h 便利店递关东煮的语气：必须含 1 个具体小动作或场景；可带 1 个 emoji；允许俏皮、自嘲、轻吐槽。禁止以'建议你''你应该''你需要''记住'开头；禁用'保持初心''坚持自我''学会爱自己''相信自己''做最好的自己'等鸡汤短语" },
        socialCaption: { type: "string", description: "≤30 字 / ≤25 words. 小红书标题感，可带反转或 hashtag" },
      }, required: ["type", "wing", "wingExplanation", "title", "coreFear", "coreDesire", "description", "traits", "growthPath", "stressArrow", "advice", "socialCaption"] } } }],
      tool_choice: { type: "function" as const, function: { name: "enneagram_result" } },
      temperature: 0.95, max_tokens: 1536,
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text(); console.error("Enneagram AI error:", response.status, t); throw new Error("AI service error");
    }
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ type: "result", data: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("enneagram error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
