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
    const model = "google/gemini-2.5-flash-lite";

    // === Batch questions mode ===
    if (body.action === "batch-questions") {
      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `你是一位温暖的心理健康评估师。请一次性生成5道情绪状态评估题目。
题目应涵盖压力、能量、社交、睡眠、情绪调节等不同方面。
问题应该温暖、自然，不要太直白或临床化。每道题提供4个选项(A/B/C/D)。
你必须调用 batch_questions 工具来返回所有题目。` },
          { role: "user", content: "请生成5道情绪状态评估题目，覆盖不同的心理健康维度。" },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "batch_questions",
            description: "返回5道情绪评估题目",
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
                      dimension: { type: "string", description: "测试方面：stress/energy/social/sleep/regulation" },
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
    const { history } = body;

    const systemPrompt = `你是一位专业的心理健康评估师。根据用户的所有回答，分析当前的情绪状态。
请温柔、专业地给出评估。注意：你不是医生，如果发现严重的心理问题迹象，请建议用户寻求专业帮助。
你必须调用 emotion_result 工具来返回结果。`;

    const userContent = `以下是用户的问答历史：\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\n请根据以上回答评估用户的情绪状态。`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "emotion_result",
        description: "返回情绪状态评估结果",
        parameters: {
          type: "object",
          properties: {
            emotionLevel: { type: "string", description: "情绪状态等级：阳光灿烂/晴朗微风/多云转晴/细雨绵绵/暴风雨前" },
            emoji: { type: "string", description: "代表当前状态的emoji" },
            title: { type: "string", description: "状态标题，如'内心有力量的你'" },
            description: { type: "string", description: "200字左右的个性化情绪分析，温暖鼓励的语气" },
            traits: {
              type: "object",
              properties: {
                stress: { type: "number", description: "压力指数 0-100（越低越好）" },
                energy: { type: "number", description: "能量值 0-100" },
                social: { type: "number", description: "社交活力 0-100" },
                sleep: { type: "number", description: "睡眠质量 0-100" },
              },
              required: ["stress", "energy", "social", "sleep"],
            },
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "3条简短的改善建议",
            },
            socialCaption: { type: "string", description: "适合分享的社交文案，30字以内，温暖有力" },
          },
          required: ["emotionLevel", "emoji", "title", "description", "traits", "suggestions", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI(model, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function" as const, function: { name: "emotion_result" } },
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
      console.error("Emotion AI error:", response.status, t);
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
    console.error("emotion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});