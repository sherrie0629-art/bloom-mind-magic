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
          { role: "system", content: `You are an Enneagram personality expert. Generate 5 scenario-based questions to determine a person's Enneagram type (1-9).
Questions should explore core motivations, fears, desires, and behavioral patterns across different life situations.
Each question has 4 options (A/B/C/D). All content in English.
You must call the batch_questions tool to return all questions.` },
          { role: "user", content: "Generate 5 Enneagram personality assessment questions." },
        ],
        tools: [{ type: "function" as const, function: { name: "batch_questions", description: "Return 5 Enneagram questions", parameters: { type: "object", properties: { questions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"] } }, dimension: { type: "string", description: "Aspect: motivation/fear/relationship/stress/growth" } }, required: ["question", "options", "dimension"] }, minItems: 5, maxItems: 5 } }, required: ["questions"] } } }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.7, max_tokens: 2048,
      });
      if (!response.ok) { const t = await response.text(); console.error("Batch error:", response.status, t); throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call");
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ type: "batch", data: args.questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Result mode
    const { history } = body;
    const systemPrompt = `You are an Enneagram personality expert. Based on the user's answers, determine their Enneagram type (1-9), wing, core fear, core desire, growth path, and stress arrow.
Provide professional but accessible analysis. All content in English.
You must call the enneagram_result tool to return results.`;
    const userContent = `Here is the user's Q&A history:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nAnalyze the Enneagram type.`;

    const response = await fetchAI(model, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      tools: [{ type: "function" as const, function: { name: "enneagram_result", description: "Return Enneagram analysis result", parameters: { type: "object", properties: {
        type: { type: "number", description: "Enneagram type 1-9" },
        wing: { type: "string", description: "Wing, e.g. '4w5' or '7w6'" },
        title: { type: "string", description: "Type name, e.g. 'The Reformer', 'The Helper'" },
        coreFear: { type: "string", description: "Core fear in 10-20 words" },
        coreDesire: { type: "string", description: "Core desire in 10-20 words" },
        description: { type: "string", description: "~200 word personalized analysis" },
        traits: { type: "object", properties: { selfAwareness: { type: "number" }, empathy: { type: "number" }, resilience: { type: "number" }, growth: { type: "number" } }, required: ["selfAwareness", "empathy", "resilience", "growth"] },
        growthPath: { type: "string", description: "Growth direction in 30-50 words" },
        stressArrow: { type: "string", description: "Stress behavior in 30-50 words" },
        advice: { type: "string", description: "Self-care advice under 50 words" },
        socialCaption: { type: "string", description: "Fun shareable caption under 30 words" },
      }, required: ["type", "wing", "title", "coreFear", "coreDesire", "description", "traits", "growthPath", "stressArrow", "advice", "socialCaption"] } } }],
      tool_choice: { type: "function" as const, function: { name: "enneagram_result" } },
      temperature: 0.7, max_tokens: 1024,
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
