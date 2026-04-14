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

    // Phase 2: Deep analysis with attachment theory
    if (body.action === "deep-analysis") {
      const { myProfile, partnerProfile, quickResult } = body;
      const deepPrompt = `You are a relationship psychology expert well-versed in attachment theory, love languages, and communication styles.

Based on the following profiles and initial analysis, write a 500-800 word deep relationship analysis.

My info: ${JSON.stringify(myProfile)}
Partner info: ${JSON.stringify(partnerProfile)}
Initial analysis: ${quickResult.overallScore}% compatibility, type "${quickResult.title}", strengths: ${quickResult.strengths.join("; ")}

Include:
1. **Attachment Style Analysis** — Predict each person's likely attachment style (Anxious/Avoidant/Secure/Fearful-Avoidant) and how they interact
2. **Communication Patterns** — How these personalities communicate and potential pitfalls
3. **Long-term Forecast** — Realistic growth trajectory for this relationship
4. **Boundary Navigation** — How to set healthy boundaries with each other

Use therapy-speak naturally. Write in markdown. Warm but professional tone.`;

      const response = await fetchAI("google/gemini-2.5-flash", {
        messages: [{ role: "user", content: deepPrompt }],
        stream: true, max_tokens: 1200,
      });
      if (!response.ok) {
        const t = await response.text(); console.error("Deep analysis error:", response.status, t);
        return new Response(JSON.stringify({ error: "Deep analysis failed" }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Phase 1: Quick structured result
    const { myProfile, partnerProfile } = body;
    const systemPrompt = `You are a relationship chemistry expert trained in attachment theory, love languages, and personality psychology. Analyze the compatibility between two people. Use the compatibility_result tool to return results. All content in English.`;
    const userContent = `Me: ${JSON.stringify(myProfile)}\nPartner: ${JSON.stringify(partnerProfile)}\nGenerate relationship chemistry analysis.`;

    const tools = [{
      type: "function",
      function: {
        name: "compatibility_result",
        description: "Return relationship chemistry analysis result",
        parameters: {
          type: "object",
          properties: {
            overallScore: { type: "number", description: "Overall compatibility percentage (0-100)" },
            title: { type: "string", description: "Relationship title, e.g. 'Soul Resonators'" },
            emoji: { type: "string" },
            summary: { type: "string", description: "80 words or less relationship overview" },
            dimensions: { type: "object", properties: { emotional: { type: "number" }, communication: { type: "number" }, values: { type: "number" }, growth: { type: "number" }, chemistry: { type: "number" } }, required: ["emotional", "communication", "values", "growth", "chemistry"] },
            strengths: { type: "array", items: { type: "string" }, description: "3-4 relationship strengths, 20 words each max" },
            conflicts: { type: "array", items: { type: "object", properties: { issue: { type: "string" }, solution: { type: "string" } }, required: ["issue", "solution"] }, description: "2 potential conflicts with solutions" },
            loveLanguage: { type: "object", properties: { mine: { type: "string" }, partner: { type: "string" }, tip: { type: "string", description: "Love language advice under 50 words" } }, required: ["mine", "partner", "tip"] },
            socialCaption: { type: "string" },
          },
          required: ["overallScore", "title", "emoji", "summary", "dimensions", "strengths", "conflicts", "loveLanguage", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI("google/gemini-2.5-flash", {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      tools, tool_choice: { type: "function", function: { name: "compatibility_result" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests 🌙" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted 💫" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service unavailable");
    }
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI returned no valid result");
    return new Response(JSON.stringify({ result: JSON.parse(toolCall.function.arguments) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("assessment-compatibility error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
