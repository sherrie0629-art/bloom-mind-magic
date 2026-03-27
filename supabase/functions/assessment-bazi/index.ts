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
      const { birthInfo } = body;
      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `你是一位精通八字命理的大师。用户的出生信息：${JSON.stringify(birthInfo || {})}。
请一次性生成5道与命理相关的问题，涉及性格、事业、感情、健康等方面，帮助你更精准地分析命盘。
每道题提供4个选项(A/B/C/D)。
你必须调用 batch_questions 工具来返回所有题目。` },
          { role: "user", content: "请生成5道八字命理分析相关的题目。" },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "batch_questions",
            description: "返回5道八字命理题目",
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
                      dimension: { type: "string", description: "测试方面：career/wealth/love/health" },
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
    const { history, birthInfo } = body;

    const systemPrompt = `你是一位精通八字命理的大师。根据用户提供的出生信息和所有回答，进行八字命理分析。
出生信息：${JSON.stringify(birthInfo || {})}
你必须调用 bazi_result 工具来返回结果。分析要专业但通俗易懂，结合用户的回答给出个性化解读。`;

    const userContent = `以下是用户的问答历史：\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\n请根据以上回答和出生信息进行八字命理分析。`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "bazi_result",
        description: "返回八字命理分析结果",
        parameters: {
          type: "object",
          properties: {
            dayMaster: { type: "string", description: "日主，如'甲木'、'丙火'" },
            fiveElements: { type: "string", description: "五行格局描述" },
            title: { type: "string", description: "命格昵称，如'天生领袖'、'温润如玉'" },
            description: { type: "string", description: "200字左右的个性化命理分析" },
            traits: {
              type: "object",
              properties: {
                career: { type: "number", description: "事业运 0-100" },
                wealth: { type: "number", description: "财运 0-100" },
                love: { type: "number", description: "感情运 0-100" },
                health: { type: "number", description: "健康运 0-100" },
              },
              required: ["career", "wealth", "love", "health"],
            },
            advice: { type: "string", description: "50字以内的开运建议" },
            socialCaption: { type: "string", description: "适合分享的社交文案，30字以内" },
          },
          required: ["dayMaster", "fiveElements", "title", "description", "traits", "advice", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI(model, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function" as const, function: { name: "bazi_result" } },
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
      console.error("Bazi AI error:", response.status, t);
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
    console.error("bazi error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});