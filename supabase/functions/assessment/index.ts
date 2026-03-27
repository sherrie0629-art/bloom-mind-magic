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

    // === Parallel Universe branch ===
    if (body.action === "parallel-universe") {
      const { mbtiType } = body;
      const puResponse = await fetchAI(model, {
        messages: [
          { role: "system", content: "你是一个脑洞大开的创意写手，擅长用30-50字写出画面感极强的趣味短文。口语化、有趣、适合社交分享。" },
          { role: "user", content: `MBTI类型是${mbtiType}。请为这个性格类型生成两个平行宇宙身份：1）魔法世界里的职业 2）赛博朋克世界里的职业。每个身份包含一个酷炫的职业名和一段30-50字的趣味描述。` },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "parallel_universe",
            description: "返回两个平行宇宙职业身份",
            parameters: {
              type: "object",
              properties: {
                magic: {
                  type: "object",
                  properties: {
                    role: { type: "string", description: "魔法世界职业名，3-6字" },
                    description: { type: "string", description: "30-50字趣味描述" },
                  },
                  required: ["role", "description"],
                },
                cyberpunk: {
                  type: "object",
                  properties: {
                    role: { type: "string", description: "赛博朋克世界职业名，3-6字" },
                    description: { type: "string", description: "30-50字趣味描述" },
                  },
                  required: ["role", "description"],
                },
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
      return new Response(JSON.stringify(puArgs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Batch questions mode ===
    if (body.action === "batch-questions") {
      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `你是一位专业的MBTI心理测评师。请一次性生成5道MBTI人格测评题目。
题目应覆盖E/I、S/N、T/F、J/P四个维度，问题要场景化、自然，避免学术化措辞。
每道题提供4个选项(A/B/C/D)。
你必须调用 batch_questions 工具来返回所有题目。` },
          { role: "user", content: "请生成5道MBTI人格测评题目，覆盖不同的人格维度。" },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "batch_questions",
            description: "返回5道MBTI测评题目",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string", description: "题目内容，场景化、自然" },
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
                      dimension: { type: "string", description: "测试维度：E/I, S/N, T/F, J/P" },
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

    const systemPrompt = `你是一位专业的MBTI心理测评师。根据用户的所有回答，分析并判断用户的MBTI类型。
你必须调用 mbti_result 工具来返回结果。`;

    const userContent = `以下是用户的问答历史：\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\n请根据以上回答分析用户的MBTI类型。`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "mbti_result",
        description: "返回MBTI测评结果和分析报告",
        parameters: {
          type: "object",
          properties: {
            mbtiType: { type: "string", description: "MBTI类型，如INFP、ENTJ等" },
            title: { type: "string", description: "该类型的中文昵称，如'调停者'、'指挥官'" },
            description: { type: "string", description: "200字左右的个性化分析，结合用户的具体回答" },
            traits: {
              type: "object",
              properties: {
                E_I: { type: "number", description: "外向倾向百分比 0-100" },
                S_N: { type: "number", description: "实感倾向百分比 0-100" },
                T_F: { type: "number", description: "思考倾向百分比 0-100" },
                J_P: { type: "number", description: "判断倾向百分比 0-100" },
              },
              required: ["E_I", "S_N", "T_F", "J_P"],
            },
            socialCaption: { type: "string", description: "适合分享的社交文案，30字以内，有趣有传播感" },
          },
          required: ["mbtiType", "title", "description", "traits", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI(model, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function" as const, function: { name: "mbti_result" } },
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
      console.error("Assessment AI error:", response.status, t);
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
    console.error("assessment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});