import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOUBAO_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, agentId, userId } = await req.json();
    const apiKey = Deno.env.get("DOUBAO_API_KEY")!;
    const model = Deno.env.get("DOUBAO_ENDPOINT_ID")!;

    const conversation = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

    const response = await fetch(DOUBAO_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `你是一个对话摘要与记忆提取助手。请完成两个任务：
1. 用2-3句话总结对话的核心内容和用户的情绪状态，提取3-5个关键话题标签。
2. 从对话中提取用户提到的具体记忆条目（事件、情绪、人物、偏好、洞察等），每条记忆要具体到可以在未来对话中引用。`,
          },
          { role: "user", content: conversation },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_summary_and_memories",
            description: "保存对话摘要、关键话题和结构化记忆条目",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3句话的对话摘要" },
                key_topics: { type: "array", items: { type: "string" }, description: "3-5个关键话题标签" },
                memories: {
                  type: "array",
                  description: "从对话中提取的具体记忆条目",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", enum: ["emotion", "event", "person", "preference", "insight"], description: "记忆类别" },
                      content: { type: "string", description: "具体记忆内容" },
                      emotion_tag: { type: "string", description: "相关情绪标签" },
                      importance: { type: "number", description: "重要程度 1-3" },
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

    // Write memories to user_memories table using service role
    if (userId && args.memories && args.memories.length > 0) {
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
