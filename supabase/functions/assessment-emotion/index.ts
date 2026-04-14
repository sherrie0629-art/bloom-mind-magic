import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

function fetchAI(model: string, requestBody: Record<string, unknown>): Promise<Response> {
  return fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...requestBody, model }) });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const model = "google/gemini-2.5-flash-lite";

    if (body.action === "batch-questions") {
      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `You are a warm, empathetic wellness coach specializing in burnout recovery and boundary-setting.
Generate 5 questions covering: burnout level, energy management, boundary-setting, sleep quality, and emotional regulation.
Questions should feel supportive and non-clinical. Use therapy-speak concepts like "boundaries", "holding space", "emotional labor".
Each has 4 options (A/B/C/D). All in English. Call batch_questions tool.` },
          { role: "user", content: "Generate 5 burnout & wellness check questions." },
        ],
        tools: [{ type: "function" as const, function: { name: "batch_questions", description: "Return 5 wellness questions", parameters: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"] } }, dimension: { type: "string", description: "Aspect: burnout/energy/boundaries/sleep/regulation" } }, required: ["question", "options", "dimension"] }, minItems: 5, maxItems: 5 } }, required: ["questions"] } } }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.7, max_tokens: 2048,
      });
      if (!response.ok) { throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call");
      return new Response(JSON.stringify({ type: "batch", data: JSON.parse(toolCall.function.arguments).questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { history } = body;
    const systemPrompt = `You are a professional wellness coach. Based on the user's answers, assess their current burnout and wellness state.
Use therapy-speak naturally: "boundaries", "emotional labor", "self-care", "holding space", "validation".
Be warm, supportive, and professional. If you notice signs of serious mental health concerns, gently suggest professional help.
All in English. Call emotion_result tool.`;

    const response = await fetchAI(model, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Q&A:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nAssess wellness state.` }],
      tools: [{ type: "function" as const, function: { name: "emotion_result", description: "Return wellness assessment result", parameters: { type: "object", properties: {
        emotionLevel: { type: "string", description: "Wellness level: Thriving/Balanced/Coasting/Running Low/Burnout Zone" },
        emoji: { type: "string" },
        title: { type: "string", description: "Title like 'Your Inner Fire is Strong' or 'Time to Recharge'" },
        description: { type: "string", description: "~200 word personalized wellness analysis, warm and encouraging" },
        traits: { type: "object", properties: { burnout: { type: "number", description: "Burnout level 0-100 (lower is better)" }, energy: { type: "number" }, boundaries: { type: "number" }, sleep: { type: "number" } }, required: ["burnout", "energy", "boundaries", "sleep"] },
        suggestions: { type: "array", items: { type: "string" }, description: "3 actionable self-care suggestions" },
        socialCaption: { type: "string", description: "Warm shareable caption under 30 words" },
      }, required: ["emotionLevel", "emoji", "title", "description", "traits", "suggestions", "socialCaption"] } } }],
      tool_choice: { type: "function" as const, function: { name: "emotion_result" } },
      temperature: 0.7, max_tokens: 1024,
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service error");
    }
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    return new Response(JSON.stringify({ type: "result", data: JSON.parse(toolCall.function.arguments) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("emotion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
