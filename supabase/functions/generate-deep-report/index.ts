import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const typeLabelsByLocale: Record<string, Record<string, string>> = {
  en: { mbti: "MBTI Personality", enneagram: "Enneagram", zodiac: "Zodiac", emotion: "Emotional Wellness", compatibility: "Relationship Compatibility" },
  zh: { mbti: "MBTI 性格", enneagram: "九型人格", zodiac: "星座解读", emotion: "心灵体检", compatibility: "缘分合盘" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Please sign in first" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { assessmentId, reportId, source: bodySource, locale: bodyLocale } = body;
    const source: "assessment" | "compatibility" = bodySource === "compatibility" ? "compatibility" : "assessment";
    const targetId = source === "compatibility" ? reportId : assessmentId;
    const locale = bodyLocale || "en";
    if (!targetId) throw new Error("Missing reportId");

    const tableName = source === "compatibility" ? "compatibility_reports" : "assessment_results";
    const { data: record, error: fetchErr } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", targetId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !record) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultData = record.result_data as any;

    if (resultData?.deepReport) {
      return new Response(JSON.stringify({ deepReport: resultData.deepReport }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Plus subscription
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .single();

    const isPlus = sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at) > new Date();

    if (!isPlus) {
      return new Response(JSON.stringify({ error: "Plus membership required", needUpgrade: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily deep report limit
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("id, deep_report_count")
      .eq("user_id", userId)
      .eq("track_date", today)
      .single();

    const currentCount = usage?.deep_report_count || 0;
    if (currentCount >= 1) {
      return new Response(JSON.stringify({ error: "Daily deep report limit reached (1/day). Come back tomorrow! 🌙", dailyLimitReached: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const labels = typeLabelsByLocale[locale] || typeLabelsByLocale.en;
    const typeKey = source === "compatibility" ? "compatibility" : (record as any).assessment_type;
    const typeLabel = labels[typeKey] || typeKey;
    const resultSummary = JSON.stringify(resultData, null, 2);

    const sectionTitles = locale === "zh"
      ? { core: "## 📋 核心人格画像", attach: "## 🧒 童年依恋模式", redflag: "## 💕 亲密关系预警", defense: "## 🛡️ 心理防御机制", career: "## 💼 职业发展洞察", growth: "## 🌱 个人成长路线", outlook: "## 🔮 给三年后的你" }
      : { core: "## 📋 Core Personality", attach: "## 🧒 Childhood Attachment", redflag: "## 💕 Relationship Red Flags", defense: "## 🛡️ Defense Mechanisms", career: "## 💼 Career Insights", growth: "## 🌱 Growth Roadmap", outlook: "## 🔮 A Letter to Future You" };

    const langLine = locale === "zh"
      ? "- 全文使用简体中文撰写，口吻像一位温柔睿智的心理学闺蜜"
      : "- Write in English, in the voice of a warm, insightful therapist-friend";

    const formatRules = locale === "zh"
      ? `每个章节必须遵循以下结构（用 markdown）：
1) 章节标题（## 开头，已给出）
2) 第一段：用一个**诊断式 hook 开场**——比如比喻、反问、画面感的一句话，避免"你的核心特质是…"这种说教开场
3) 2-3 段正文：每段 80-150 字，行文流畅，关键名词用 **加粗**，必要时用 *斜体* 强调心理学术语
4) 必要时使用 \`- 列表\` 列举可识别的模式（每点 1 句话）
5) **每章必须有一句金句**，单独一行，格式：\`> 💎 这里是金句（≤30 字，可被截图分享）\`
6) 章节末尾追加一行：\`**🎬 行动小任务**：……\`（一句 ≤40 字的可执行动作）
7) 章节之间用 \`---\` 分隔

特别说明：
- 最后一章 \`${sectionTitles.outlook}\` 改写为"给三年后的你的一封信"，第二人称、150-220 字、有情绪张力，不需要 🎬 行动小任务
- 全文 3000-4500 字，每章 400-600 字
- 避免万能模板话术，要紧贴用户的具体测评结果`
      : `Each section MUST follow this structure (markdown):
1) ## heading (provided)
2) Opening paragraph: a **diagnostic hook**—a metaphor, vivid image, or rhetorical question. Never start with "Your core trait is…"
3) 2-3 body paragraphs (60-110 words each), flowing prose. **Bold** key terms, *italicize* psychological concepts
4) Use \`- bullet lists\` when patterns are enumerable (one sentence each)
5) **Every section MUST contain one signature quote** on its own line, formatted: \`> 💎 the quote here (≤25 words, screenshot-worthy)\`
6) End each section with: \`**🎬 Action Step**: …\` (one ≤25-word actionable micro-task)
7) Separate sections with \`---\`

Special:
- The last section \`${sectionTitles.outlook}\` is a letter "to you, three years from now"—second person, 120-180 words, emotionally resonant. No 🎬 Action Step
- Total 3000-4500 words, each section 400-600 words
- Stay tightly grounded in the user's specific assessment data; avoid generic horoscope-style platitudes`;

    const systemPrompt = `You are a senior psychologist and personality analysis expert with 20 years of clinical experience, also gifted at writing in a warm, literary voice. Generate a deeply personalized analysis report based on the user's ${typeLabel} assessment results.

Required sections (in this exact order, using the provided ## headings):

${sectionTitles.core}
Deep portrait of overt and covert personality traits.

${sectionTitles.attach}
Infer the likely childhood attachment style (secure / anxious / avoidant / disorganized) and how it shapes today's relationships.

${sectionTitles.redflag}
Romantic patterns: types of partners attracted, common conflict cycles, how to set healthy boundaries.

${sectionTitles.defense}
Common defense mechanisms (rationalization, projection, repression…) and how they show up in daily decisions.

${sectionTitles.career}
Best-fit career directions, ideal work environments, hidden talents, and likely burnout traps.

${sectionTitles.growth}
Concrete self-improvement practices and weekly exercises—not generic advice.

${sectionTitles.outlook}
A letter from the present to "you, three years from now"—warm, hopeful, specific.

${formatRules}

Tone & quality:
- Warm, professional, insightful
- Use vivid examples and metaphors
- Avoid clichés; every sentence should feel personally crafted
${langLine}`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: locale === "zh"
            ? `以下是用户的${typeLabel}测评结果：\n\n${resultSummary}\n\n请生成深度分析报告（全文使用简体中文）。`
            : `Here are the user's ${typeLabel} assessment results:\n\n${resultSummary}\n\nPlease generate the deep analysis report.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, please try again later 🌙" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted 💫" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service temporarily unavailable");
    }

    const aiData = await response.json();
    const deepReport = aiData.choices?.[0]?.message?.content || "";

    // Save report and increment usage
    await supabase
      .from(tableName)
      .update({ result_data: { ...resultData, deepReport } })
      .eq("id", targetId);

    // Increment deep_report_count
    if (usage) {
      await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
        .from("usage_tracking")
        .update({ deep_report_count: currentCount + 1 })
        .eq("id", usage.id);
    } else {
      await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
        .from("usage_tracking")
        .insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 0, deep_report_count: 1 });
    }

    return new Response(JSON.stringify({ deepReport }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-deep-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
