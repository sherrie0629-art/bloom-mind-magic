import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_ASSESS = 5;
const PLUS_DAILY_ASSESS = 20;

async function checkAssessmentQuota(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  if (!token || token === Deno.env.get("SUPABASE_ANON_KEY")) return null; // anonymous - allow (batch-questions only)

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: claimsData, error } = await supabase.auth.getClaims(token);
  if (error || !claimsData?.claims?.sub) return null;

  const userId = claimsData.claims.sub as string;
  const authedClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader! } },
  });

  const { data: sub } = await authedClient.from("user_subscriptions").select("plan, expires_at").eq("user_id", userId).single();
  const isPlus = sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at) > new Date();
  const dailyLimit = isPlus ? PLUS_DAILY_ASSESS : FREE_DAILY_ASSESS;

  const today = new Date().toISOString().split("T")[0];
  const { data: usage } = await authedClient.from("usage_tracking").select("id, assessment_count").eq("user_id", userId).eq("track_date", today).single();
  const currentCount = usage?.assessment_count || 0;

  if (currentCount >= dailyLimit) {
    return new Response(JSON.stringify({ error: `Daily assessment limit reached (${dailyLimit}/day). ${isPlus ? "Come back tomorrow!" : "Upgrade to Plus for more!"} 🌙` }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Increment
  if (usage) {
    await authedClient.from("usage_tracking").update({ assessment_count: currentCount + 1 }).eq("id", usage.id);
  } else {
    await authedClient.from("usage_tracking").insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 1, deep_report_count: 0 });
  }
  return null;
}

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
          { role: "system", content: "You are a wildly creative writer who crafts fun, shareable 30-50 word character descriptions. Casual, vivid, and social-media ready." },
          { role: "user", content: `MBTI type: ${mbtiType}. Generate two parallel universe identities: 1) A fantasy/magic world role 2) A cyberpunk world role. Each should have a cool title (3-6 words) and a fun 30-50 word description.` },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "parallel_universe",
            description: "Return two parallel universe role identities",
            parameters: {
              type: "object",
              properties: {
                magic: { type: "object", properties: { role: { type: "string", description: "Fantasy world role title, 3-6 words" }, description: { type: "string", description: "30-50 word fun description" } }, required: ["role", "description"] },
                cyberpunk: { type: "object", properties: { role: { type: "string", description: "Cyberpunk world role title, 3-6 words" }, description: { type: "string", description: "30-50 word fun description" } }, required: ["role", "description"] },
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
      return new Response(JSON.stringify(puArgs), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Batch questions mode (no quota check - just generating questions) ===
    if (body.action === "batch-questions") {
      const response = await fetchAI(model, {
        messages: [
          { role: "system", content: `You are a professional MBTI personality assessment expert. Generate 10 MBTI personality quiz questions.
Questions should cover E/I, S/N, T/F, J/P dimensions. Make them scenario-based, natural, and engaging.
Each question has 4 options (A/B/C/D). Respond in the language indicated by LANG below.
You must call the batch_questions tool to return all questions.` },
          { role: "user", content: "Generate 10 MBTI personality assessment questions covering different personality dimensions." },
        ],
        tools: [{
          type: "function" as const,
          function: {
            name: "batch_questions",
            description: "Return 10 MBTI assessment questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string", description: "Question content, scenario-based and natural" },
                      options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"] } },
                      dimension: { type: "string", description: "Dimension: E/I, S/N, T/F, J/P" },
                    },
                    required: ["question", "options", "dimension"],
                  },
                  minItems: 10, maxItems: 10,
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function" as const, function: { name: "batch_questions" } },
        temperature: 0.7, max_tokens: 2048,
      });
      if (!response.ok) { const t = await response.text(); console.error("Batch questions error:", response.status, t); throw new Error("AI service error"); }
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ type: "batch", data: args.questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Result mode — check quota server-side ===
    const quotaError = await checkAssessmentQuota(req);
    if (quotaError) return quotaError;

    const { history } = body;
    const systemPrompt = `You are a professional MBTI personality assessment expert. Based on the user's answers, determine their MBTI type.
You must call the mbti_result tool to return the result. Respond in the language indicated by LANG below.`;
    const userContent = `Here is the user's Q&A history:\n${history.map((h: any, i: number) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}\n\nPlease analyze the user's MBTI type based on these answers.`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "mbti_result",
        description: "Return MBTI assessment result and analysis report",
        parameters: {
          type: "object",
          properties: {
            mbtiType: { type: "string", description: "MBTI type, e.g. INFP, ENTJ" },
            title: { type: "string", description: "Type nickname, e.g. 'The Mediator', 'The Commander'" },
            description: { type: "string", description: "~200 word personalized analysis based on user's specific answers" },
            traits: {
              type: "object",
              properties: {
                E_I: { type: "number", description: "Extraversion percentage 0-100" },
                S_N: { type: "number", description: "Sensing percentage 0-100" },
                T_F: { type: "number", description: "Thinking percentage 0-100" },
                J_P: { type: "number", description: "Judging percentage 0-100" },
              },
              required: ["E_I", "S_N", "T_F", "J_P"],
            },
            socialCaption: { type: "string", description: "Fun shareable caption under 30 words" },
          },
          required: ["mbtiType", "title", "description", "traits", "socialCaption"],
        },
      },
    }];

    const response = await fetchAI(model, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      tools, tool_choice: { type: "function" as const, function: { name: "mbti_result" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many requests, please try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text(); console.error("Assessment AI error:", response.status, t); throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ type: "result", data: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("assessment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
