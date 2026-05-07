import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_ASSESS = 5;
const PLUS_DAILY_ASSESS = 20;

async function checkAssessmentQuota(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  if (!token || token === Deno.env.get("SUPABASE_ANON_KEY")) return null; // anonymous - allow (batch-questions only)

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: claimsData, error } = await supabase.auth.getClaims(token);
  if (error || !claimsData?.claims?.sub) return null;

  const userId = claimsData.claims.sub as string;
  const authedClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader! } },
  });

  const { data: sub } = await authedClient.from("user_subscriptions").select("plan, expires_at").eq("user_id", userId).single();
  const isPlus = sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at) > new Date();
  const dailyLimit = isPlus ? PLUS_DAILY_ASSESS : FREE_DAILY_ASSESS;

  const today = new Date().toISOString().split("T")[0];
  const { data: usage } = await authedClient.from("usage_tracking").select("id, assessment_count").eq("user_id", userId).eq("track_date", today).single();
  const currentCount = usage?.assessment_count || 0;

  if (currentCount >= dailyLimit) {
    return new Response(JSON.stringify({ error: `Daily assessment limit reached (${dailyLimit}/day). ${isPlus ? "Come back tomorrow!" : "Upgrade to Plus for more!"} 🌙` }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Increment
  if (usage) {
    await authedClient.from("usage_tracking").update({ assessment_count: currentCount + 1 }).eq("id", usage.id);
  } else {
    await authedClient.from("usage_tracking").insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 1, deep_report_count: 0 });
  }
  return null;
}

function fetchAI(model: string, requestBody: Record<string, unknown>): Promise<Response> {
  return fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...requestBody, model }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const locale = body.locale || "en";
    const langInstr = locale === "zh" ? "\nLANG: Respond entirely in Simplified Chinese (简体中文). All field values, descriptions, captions must be Chinese." : "\nLANG: Respond entirely in natural English.";
    // Faster Gemini variant; falls back automatically if unavailable.
    const model = "google/gemini-3.1-flash-lite-preview";
    const fallbackModel = "google/gemini-2.5-flash-lite";

    // === Parallel Universe branch ===
    if (body.action === "parallel-universe") {
      const { mbtiType } = body;
      const puResponse = await fetchAI(model, {
        messages: [
          { role: "system", content: `You are a wildly creative writer who crafts fun, shareable 30-50 word character descriptions. Casual, vivid, and social-media ready.${langInstr}` },
          { role: "user", content: `MBTI type: ${mbtiType}. Generate two parallel universe identities: 1) A fantasy/magic world role 2) A cyberpunk world role. Each should have a cool title (3-6 words) and a fun 30-50 word description.` },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "parallel_universe",
            description: "Return two parallel universe role identities",
            parameters: {
              type: "object",
              properties: {
                magic: { type: "object", properties: { role: { type: "string", description: "Fantasy world role title, 3-6 words" }, description: { type: "string", description: "30-50 word fun description" } }, required: ["role", "description"] },
                cyberpunk: { type: "object", properties: { role: { type: "string", description: "Cyberpunk world role title, 3-6 words" }, description: { type: "string", description: "30-50 word fun description" } }, required: ["role", "description"] },
              },
              required: ["magic", "cyberpunk"],
            },
          },
        }],
        tool_choice: { type: "function" as const, function: { name: "parallel_universe" } },
      });
      if (!puResponse.ok) throw new Error("AI service error");
      const puData = await puResponse.json();
      const puArgs = JSON.parse(puData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments);
      return new Response(JSON.stringify(puArgs), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Batch questions mode (no quota check - just generating questions) ===
    if (body.action === "batch-questions") {
      // ---- Cache layer: shared, locale + variant bucketed, 1h TTL ----
      // We keep N variants per locale; client rotates variant per user so
      // the same person rarely sees the same question set twice in a row.
      const VARIANT_COUNT = 5;
      const PROMPT_VERSION = "v3"; // bump to invalidate stale caches
      const rawVariant = Number.isFinite(Number(body.variant)) ? Math.floor(Number(body.variant)) : Math.floor(Math.random() * VARIANT_COUNT);
      const variant = ((rawVariant % VARIANT_COUNT) + VARIANT_COUNT) % VARIANT_COUNT;
      const CACHE_BUCKET = "assessment-cache";
      const CACHE_TTL_MS = 60 * 60 * 1000;
      const cacheKey = `mbti-batch-${locale}-${PROMPT_VERSION}-v${variant}.json`;
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      try {
        const { data: existing } = await adminClient.storage.from(CACHE_BUCKET).list("", { search: cacheKey, limit: 1 });
        const hit = existing?.find((f) => f.name === cacheKey);
        if (hit) {
          const updatedAt = hit.updated_at ? new Date(hit.updated_at).getTime() : 0;
          if (Date.now() - updatedAt < CACHE_TTL_MS) {
            const { data: file } = await adminClient.storage.from(CACHE_BUCKET).download(cacheKey);
            if (file) {
              const text = await file.text();
              const cached = JSON.parse(text);
              if (Array.isArray(cached?.questions) && cached.questions.length >= 10) {
                return new Response(JSON.stringify({ type: "batch", data: cached.questions, cached: true }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("Cache read failed:", e);
      }

      const isZh = locale === "zh";
      const styleGuide = isZh ? `
你是一位会写互动小说的 MBTI 测评设计师。请生成 10 道"剧情化"题目，让用户像玩文字游戏一样穿越 10 个小场景，沉浸式探索自己。

【题干硬性要求】
- 每题 ≤ 60 字，第二人称（"你…"），有画面感、有钩子（一个谜 / 一个尴尬 / 一个突发事件 / 一个选择困境）。
- 每题以 1 个 emoji 开头作为场景标识（如 🌙 ☕ 🛸 🪞 🎭 📮 🚪 🎲 🌧 🪐），10 题 emoji 不重复。
- 场景多样：深夜便利店、平行世界派对、神秘短信、合租房凌晨 3 点、外星观察员、电梯故障、童年抽屉、镜中陌生人、收到匿名礼物、限定 24 小时变形等。
- 严禁问卷腔："你更倾向于…"、"通常情况下…"、"在工作中…"、"以下哪种…" —— 一律不要。

【选项硬性要求】
- 4 个选项 (A/B/C/D)，每个 10–22 字，是"我会这样做 / 这样想"的具体行动或念头，自带性格色彩。
- 不要让 4 个选项明显对应 4 种刻板人格；保持"哪个都有点像我"的微妙感。
- 允许其中 1 个选项略"反套路 / 黑色幽默 / 中二"作为彩蛋。
- 不要在选项里出现 E/I/S/N/T/F/J/P 字母或维度名。

【维度覆盖】
10 题大致均分到 E/I、S/N、T/F、J/P 四个维度（每维 2–3 题）。dimension 字段必须如实标注真实考察维度。

【语言风格】
中文要自然、年轻、有网感（可适度用"破防""emo""社死""摆烂"等，但全文不超过 2 处），不要翻译腔。

【示例（仅示范风格，不要照抄）】
题：🌙 凌晨两点，你刷到三年没联系的朋友突然发来一句"在吗"。
A. 立刻回："在，怎么了？"
B. 截图甩进闺蜜群："这什么意思"
C. 划走，假装没看见
D. 回个"嗯"，等对方先说

必须调用 batch_questions 工具返回 10 道题。` : `
You are an interactive-fiction MBTI quiz designer. Generate 10 short story-like scenes the user walks through, so the quiz feels like a text-based game, not a questionnaire.

[Question rules]
- Each ≤ 30 words, 2nd person ("You ..."), vivid and hook-y (a mystery / awkward moment / sudden event / dilemma).
- Start each question with one scene-setting emoji (🌙 ☕ 🛸 🪞 🎭 📮 🚪 🎲 🌧 🪐 ...), no emoji repeated across the 10 questions.
- Diverse scenes: late-night convenience store, parallel-universe party, mystery text, 3am in a shared flat, alien observer, stuck elevator, childhood drawer, stranger in the mirror, anonymous gift, 24h shapeshift, etc.
- Banned phrasing: "Do you prefer...", "In general...", "At work...", "Which of the following..." — none of that.

[Option rules]
- 4 options (A/B/C/D), each 6–14 words, written as a concrete action or inner thought ("I'd ...").
- Don't make the 4 options obviously map to 4 stereotypes; keep them all faintly tempting.
- One option may be slightly off-beat / dark-humour / chaotic as an Easter egg.
- Never mention E/I/S/N/T/F/J/P or dimension names in option text.

[Dimension coverage]
Roughly even split across E/I, S/N, T/F, J/P (2–3 each). The dimension field must reflect the true axis.

[Tone]
Casual, modern, slightly playful — not clinical.

You MUST call the batch_questions tool to return all 10 questions.`;
      const aiPayload = {
        messages: [
          { role: "system", content: `${styleGuide}${langInstr}` },
          { role: "user", content: isZh ? "请生成 10 道剧情化的 MBTI 场景题，覆盖 E/I、S/N、T/F、J/P 四个维度。" : "Generate 10 story-driven MBTI scene questions covering E/I, S/N, T/F, J/P." },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "batch_questions",
            description: "Return 10 MBTI assessment questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string", description: "Question content, scenario-based and natural" },
                      options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"] } },
                      dimension: { type: "string", description: "Dimension: E/I, S/N, T/F, J/P" },
                    },
                    required: ["question", "options", "dimension"],
                  },
                  minItems: 10, maxItems: 10,
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.85, max_tokens: 1800,
      };

      // Try fast preview model first; fall back to stable model on failure.
      let response = await fetchAI(model, aiPayload);
      if (!response.ok) {
        const t = await response.text();
        console.warn(`Primary model ${model} failed (${response.status}): ${t}. Falling back.`);
        response = await fetchAI(fallbackModel, aiPayload);
      }
      if (!response.ok) { const t = await response.text(); console.error("Batch questions error:", response.status, t); throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const args = JSON.parse(toolCall.function.arguments);

      // Write through to cache (best-effort, non-blocking).
      if (Array.isArray(args.questions) && args.questions.length >= 10) {
        adminClient.storage
          .from(CACHE_BUCKET)
          .upload(cacheKey, new Blob([JSON.stringify({ questions: args.questions, ts: Date.now() })], { type: "application/json" }), { upsert: true, contentType: "application/json" })
          .catch((e: unknown) => console.error("Cache write failed:", e));
      }

      return new Response(JSON.stringify({ type: "batch", data: args.questions, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Result mode — check quota server-side ===
    const quotaError = await checkAssessmentQuota(req);
    if (quotaError) return quotaError;

    const { history } = body;
    const systemPrompt = `You are a professional MBTI personality assessment expert. Based on the user's answers, determine their MBTI type.
You must call the mbti_result tool to return the result. Respond in the language indicated by LANG below.${langInstr}`;
    const userContent = `Here is the user's Q&A history:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nPlease analyze the user's MBTI type based on these answers.`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "mbti_result",
        description: "Return MBTI assessment result and analysis report",
        parameters: {
          type: "object",
          properties: {
            mbtiType: { type: "string", description: "MBTI type, e.g. INFP, ENTJ" },
            title: { type: "string", description: "Type nickname, e.g. 'The Mediator', 'The Commander'" },
            description: { type: "string", description: "~200 word personalized analysis based on user's specific answers" },
            traits: {
              type: "object",
              properties: {
                E_I: { type: "number", description: "Extraversion percentage 0-100" },
                S_N: { type: "number", description: "Sensing percentage 0-100" },
                T_F: { type: "number", description: "Thinking percentage 0-100" },
                J_P: { type: "number", description: "Judging percentage 0-100" },
              },
              required: ["E_I", "S_N", "T_F", "J_P"],
            },
            socialCaption: { type: "string", description: "Fun shareable caption under 30 words" },
          },
          required: ["mbtiType", "title", "description", "traits", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI(model, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      tools, tool_choice: { type: "function" as const, function: { name: "mbti_result" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests, please try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text(); console.error("Assessment AI error:", response.status, t); throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ type: "result", data: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("assessment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
