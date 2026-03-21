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
    const aiConfig = await getAIConfig("google/gemini-2.5-flash-lite");
    const defaultModel = "google/gemini-2.5-flash-lite";

    // === Batch questions mode ===
    if (body.action === "batch-questions") {
      const { zodiacSign } = body;
      const response = await fetchAI(aiConfig, defaultModel, {
        messages: [
          { role: "system", content: `你是一位专业的星座占卜师。用户的星座是：${zodiacSign || "未知"}。
请一次性生成5道与当前生活状态、心理感受相关的问题，帮助你更精准地解读运势。
问题应涵盖综合运势、爱情、事业、财运等方面，自然有趣。每道题提供4个选项(A/B/C/D)。
你必须调用 batch_questions 工具来返回所有题目。` },
          { role: "user", content: "请生成5道星座运势解读相关的题目。" },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "batch_questions",
            description: "返回5道星座运势题目",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string", description: "题目内容" },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string", description: "选项标签 A/B/C/D" },
                            text: { type: "string", description: "选项内容" },
                          },
                          required: ["label", "text"],
                        },
                      },
                      dimension: { type: "string", description: "测试方面：overall/love/career/fortune" },
                    },
                    required: ["question", "options", "dimension"],
                  },
                  minItems: 5,
                  maxItems: 5,
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.7,
        max_tokens: 2048,
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Batch questions error:", response.status, t);
        throw new Error("AI service error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const args = JSON.parse(toolCall.function.arguments);

      return new Response(JSON.stringify({ type: "batch", data: args.questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Result mode ===
    const { history, zodiacSign } = body;

    const systemPrompt = `你是一位专业的星座占卜师。用户的星座是：${zodiacSign || "未知"}。
根据用户的星座和所有回答，生成详细的运势解读报告。
你必须调用 zodiac_result 工具来返回结果。`;

    const userContent = `以下是用户的问答历史：\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\n请根据以上回答和用户星座进行运势解读。`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "zodiac_result",
        description: "返回星座运势解读结果",
        parameters: {
          type: "object",
          properties: {
            zodiacSign: { type: "string", description: "星座名称" },
            element: { type: "string", description: "守护元素：火/土/风/水" },
            title: { type: "string", description: "运势主题，如'星光璀璨期'、'内省蓄力期'" },
            description: { type: "string", description: "200字左右的个性化运势解读" },
            traits: {
              type: "object",
              properties: {
                overall: { type: "number", description: "综合运势 0-100" },
                love: { type: "number", description: "爱情运 0-100" },
                career: { type: "number", description: "事业运 0-100" },
                fortune: { type: "number", description: "财运 0-100" },
              },
              required: ["overall", "love", "career", "fortune"],
            },
            luckyItems: {
              type: "object",
              properties: {
                color: { type: "string", description: "幸运色" },
                number: { type: "string", description: "幸运数字" },
                direction: { type: "string", description: "幸运方位" },
              },
              required: ["color", "number", "direction"],
            },
            advice: { type: "string", description: "50字以内的本周建议" },
            socialCaption: { type: "string", description: "适合分享的社交文案，30字以内" },
          },
          required: ["zodiacSign", "element", "title", "description", "traits", "luckyItems", "advice", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI(aiConfig, defaultModel, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function" as const, function: { name: "zodiac_result" } },
      temperature: 0.7,
      max_tokens: 1024,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求太频繁，请稍后再试" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度已用尽" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Zodiac AI error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ type: "result", data: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zodiac error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
