import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIConfig { url: string; apiKey: string; model: string; }

async function getAIConfig(defaultModel: string, isStream = false): Promise<AIConfig> {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await sb.from("app_settings").select("value").eq("key", "ai_provider").single();
  const provider = data?.value || "lovable";
  if (provider === "doubao") {
    return {
      url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      apiKey: Deno.env.get("DOUBAO_API_KEY")!,
      model: isStream ? Deno.env.get("DOUBAO_STREAM_ENDPOINT_ID")! : Deno.env.get("DOUBAO_ENDPOINT_ID")!,
    };
  }
  return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY")!, model: defaultModel };
}

function getLovableFallback(defaultModel: string): AIConfig {
  return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY")!, model: defaultModel };
}

async function fetchAI(aiConfig: AIConfig, defaultModel: string, requestBody: Record<string, unknown>): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(aiConfig.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${aiConfig.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, model: aiConfig.model }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp;
  } catch (e) {
    console.error("Primary AI failed, falling back to Lovable:", e);
    const fallback = getLovableFallback(defaultModel);
    return fetch(fallback.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${fallback.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, model: fallback.model }),
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Phase 2: Stream deep analysis
    if (body.action === "deep-analysis") {
      const { myProfile, partnerProfile, quickResult } = body;
      const aiConfig = await getAIConfig("google/gemini-2.5-flash", true);

      const deepPrompt = `你是一位关系分析专家。基于以下信息和初步分析结果，撰写一份500-800字的深度关系分析。

我的信息：${JSON.stringify(myProfile)}
对方信息：${JSON.stringify(partnerProfile)}
初步分析：契合度${quickResult.overallScore}%，类型"${quickResult.title}"，优势：${quickResult.strengths.join("；")}

请包含：依恋模式匹配、沟通模式建议、长期发展预测。使用markdown格式，语言温暖专业。`;

      const requestBody = {
        messages: [{ role: "user", content: deepPrompt }],
        stream: true,
        max_tokens: 1200,
      };

      // For streaming, use a special flow: try primary, verify first data arrives within 10s, else fallback
      let response: Response;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        response = await fetch(aiConfig.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${aiConfig.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, model: aiConfig.model }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } catch (e) {
        console.error("Primary AI stream connect failed, falling back:", e);
        const fallback = getLovableFallback("google/gemini-2.5-flash");
        response = await fetch(fallback.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${fallback.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, model: fallback.model }),
        });
      }

      if (!response.ok) {
        // If primary returned non-ok, try fallback
        const errText = await response.text();
        console.error("Primary stream non-ok, falling back:", response.status, errText);
        const fallback = getLovableFallback("google/gemini-2.5-flash");
        response = await fetch(fallback.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${fallback.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, model: fallback.model }),
        });
      }

      if (!response.ok) {
        const t = await response.text();
        console.error("Deep analysis error:", response.status, t);
        return new Response(JSON.stringify({ error: "深度分析生成失败" }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Wrap stream with a read timeout: if no data in 10s, abort and fallback
      const reader = response.body!.getReader();
      let usedFallback = false;

      const streamWithTimeout = new ReadableStream({
        async start(controller) {
          let firstChunkReceived = false;
          const readTimeout = setTimeout(async () => {
            if (!firstChunkReceived) {
              console.error("Stream read timeout, falling back to Lovable");
              reader.cancel();
              usedFallback = true;
              try {
                const fb = getLovableFallback("google/gemini-2.5-flash");
                const fbResp = await fetch(fb.url, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${fb.apiKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ ...requestBody, model: fb.model }),
                });
                if (fbResp.ok && fbResp.body) {
                  const fbReader = fbResp.body.getReader();
                  while (true) {
                    const { done, value } = await fbReader.read();
                    if (done) { controller.close(); return; }
                    controller.enqueue(value);
                  }
                } else {
                  controller.close();
                }
              } catch (e2) {
                console.error("Fallback stream also failed:", e2);
                controller.close();
              }
            }
          }, 10000);

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (usedFallback) return;
              if (done) { clearTimeout(readTimeout); controller.close(); return; }
              if (!firstChunkReceived) { firstChunkReceived = true; clearTimeout(readTimeout); }
              controller.enqueue(value);
            }
          } catch (e) {
            clearTimeout(readTimeout);
            if (!usedFallback) controller.close();
          }
        },
      });

      return new Response(streamWithTimeout, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Phase 1: Quick structured result
    const { myProfile, partnerProfile } = body;
    const aiConfig = await getAIConfig("google/gemini-2.5-flash");

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

    const response = await fetchAI(aiConfig, "google/gemini-2.5-flash", {
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
