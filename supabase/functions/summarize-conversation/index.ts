import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check - extract userId from JWT, not from request body
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { messages, agentId } = await req.json();

    const conversation = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a conversation summarizer and memory extraction assistant. Complete two tasks:
1. Summarize the conversation in 2-3 sentences, capturing the core content and the user's emotional state. Extract 3-5 key topic tags.
2. Extract specific memory entries from the conversation (events, emotions, people, preferences, insights). Each memory should be specific enough to reference naturally in future conversations.`,
          },
          { role: "user", content: conversation },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_summary_and_memories",
            description: "Save conversation summary, key topics, and structured memory entries",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence conversation summary" },
                key_topics: { type: "array", items: { type: "string" }, description: "3-5 key topic tags" },
                memories: {
                  type: "array",
                  description: "Specific memory entries extracted from the conversation, each specific enough to reference in future conversations",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", enum: ["emotion", "event", "person", "preference", "insight"], description: "Memory category" },
                      content: { type: "string", description: "Specific memory content, e.g. 'User argued with their partner about household chores'" },
                      emotion_tag: { type: "string", description: "Related emotion tag, e.g. anger, anxiety, happiness, sadness" },
                      importance: { type: "number", description: "Importance level 1-3, 3 being most important" },
                    },
                    required: ["category", "content", "importance"],
                  },
                },
              },
              required: ["summary", "key_topics", "memories"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_summary_and_memories" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Summarize error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = JSON.parse(toolCall.function.arguments);

    if (args.memories && args.memories.length > 0) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const memoryRows = args.memories.map((m: any) => ({
        user_id: userId,
        agent_id: agentId,
        category: m.category,
        content: m.content,
        emotion_tag: m.emotion_tag || null,
        importance: m.importance || 1,
      }));

      const { error } = await supabaseAdmin.from("user_memories").insert(memoryRows);
      if (error) console.error("Insert memories error:", error);
    }

    return new Response(JSON.stringify({ summary: args.summary, key_topics: args.key_topics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
