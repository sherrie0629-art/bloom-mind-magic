import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Phase 2: Stream deep analysis
    if (body.action === "deep-analysis") {
      const { myProfile, partnerProfile, quickResult } = body;

      const deepPrompt = `你是一位关系分析专家。基于以下信息和初步分析结果，撰写一份500-800字的深度关系分析。

我的信息：${JSON.stringify(myProfile)}
对方信息：${JSON.stringify(partnerProfile)}
初步分析：契合度${quickResult.overallScore}%，类型"${quickResult.title}"，优势：${quickResult.strengths.join("；")}

请包含：依恋模式匹配、沟通模式建议、长期发展预测。使用markdown格式，语言温暖专业。`;

      const response = await fetchAI("google/gemini-2.5-flash", {
        messages: [{ role: "user", content: deepPrompt }],
        stream: true,
        max_tokens: 1200,
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Deep analysis error:", response.status, t);
        return new Response(JSON.stringify({ error: "深度分析生成失败" }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Phase 1: Quick structured result
    const { myProfile, partnerProfile } = body;

    const systemPrompt = `你是一位关系分析专家。用户提供了双方性格信息，请快速生成关系分析。调用 compatibility_result 工具返回结果。所有内容用中文。`;

    const userContent = `我：${JSON.stringify(myProfile)}\n对方：${JSON.stringify(partnerProfile)}\n请生成关系合盘分析。`;

    const tools = [
      {
        type: "function",
        function: {
          name: "compatibility_result",
          description: "返回关系合盘分析结果",
          parameters: {
            type: "object",
            properties: {
              overallScore: { type: "number", description: "总体契合度百分比 (0-100)" },
              title: { type: "string", description: "关系标题，如'灵魂共振者'" },
              emoji: { type: "string", description: "代表关系的emoji" },
              summary: { type: "string", description: "80字以内的关系总评" },
              dimensions: {
                type: "object",
                properties: {
                  emotional: { type: "number" },
                  communication: { type: "number" },
                  values: { type: "number" },
                  growth: { type: "number" },
                  chemistry: { type: "number" },
                },
                required: ["emotional", "communication", "values", "growth", "chemistry"],
              },
              strengths: { type: "array", items: { type: "string" }, description: "3-4个关系优势，每条20字以内" },
              conflicts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    issue: { type: "string" },
                    solution: { type: "string" },
                  },
                  required: ["issue", "solution"],
                },
                description: "2个潜在冲突及化解方案",
              },
              loveLanguage: {
                type: "object",
                properties: {
                  mine: { type: "string" },
                  partner: { type: "string" },
                  tip: { type: "string", description: "50字以内的爱语建议" },
                },
                required: ["mine", "partner", "tip"],
              },
              socialCaption: { type: "string", description: "社交分享文案" },
            },
            required: ["overallScore", "title", "emoji", "summary", "dimensions", "strengths", "conflicts", "loveLanguage", "socialCaption"],
          },
        },
      },
    ];

    const response = await fetchAI("google/gemini-2.5-flash", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "compatibility_result" } },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求太频繁，请稍后再试 🌙" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度已用尽 💫" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI 服务暂时不可用");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI 未返回有效结果");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assessment-compatibility error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});