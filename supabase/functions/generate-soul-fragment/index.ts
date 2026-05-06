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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, context, sourceId, locale: bodyLocale } = await req.json();
    const locale = bodyLocale || "en";
    const langInstr = locale === "zh" ? "\nLANG: 全部用简体中文输出，碎片名 2-6 个汉字，描述 1-2 句简洁中文。" : "\nLANG: Respond entirely in natural English.";

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a poetic soul fragment naming specialist. Based on the user's ${type === "assessment" ? "psychological assessment results" : "conversation"}, distill a "Soul Fragment" that represents their current inner state.
The fragment name should be short (2-4 words), poetic and evocative, like "Spark of Courage", "Gentle Raindrop", "Silent Moonlight", "Blooming Stardust".
The description should be 1-2 sentences explaining what this fragment represents.
The emoji should be a single emoji that best represents the fragment's essence.
The color should be a hex color value matching the fragment's emotional tone.${langInstr}`,
          },
          { role: "user", content: context },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_soul_fragment",
            description: "Create a soul fragment",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Fragment name, 2-4 words, poetic and concise" },
                description: { type: "string", description: "1-2 sentence description of the fragment's meaning" },
                icon: { type: "string", description: "A single emoji representing the fragment" },
                color: { type: "string", description: "Fragment color hex value, e.g. #f59e0b" },
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
