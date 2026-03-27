import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, context, sourceId } = await req.json();

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `你是一个诗意的心灵碎片命名师。根据用户的${type === "assessment" ? "心理测评结果" : "对话内容"}，提炼出一个代表其当前心灵状态的"灵魂碎片"。
碎片名称应简短（4-6个字）、诗意且有画面感，如"勇敢的火花"、"温柔的水滴"、"沉默的月光"、"绽放的星辰"。
描述应1-2句话，解释这枚碎片代表的含义。
emoji应选择最能代表碎片本质的单个emoji。
颜色应是与碎片情感匹配的hex色值。`,
          },
          { role: "user", content: context },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_soul_fragment",
            description: "创建一枚灵魂碎片",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "碎片名称，4-6个字，诗意简短" },
                description: { type: "string", description: "1-2句话描述碎片含义" },
                icon: { type: "string", description: "代表碎片的单个emoji" },
                color: { type: "string", description: "碎片色调hex值，如#f59e0b" },
              },
              required: ["name", "description", "icon", "color"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_soul_fragment" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Fragment generation error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-soul-fragment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});