// Semantic recall: embeds a query and returns top-K relevant memories + user profile facts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "openai/text-embedding-3-small";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supaAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: claimsData, error: claimsErr } = await supaAuth.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { query, agentId, k = 8 } = await req.json();
    if (!query || !agentId) {
      return new Response(JSON.stringify({ error: "query and agentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Embed the query
    let memories: any[] = [];
    try {
      const embRes = await fetch(EMBED_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: EMBED_MODEL, input: String(query).slice(0, 8000), dimensions: 1536 }),
      });
      if (embRes.ok) {
        const embData = await embRes.json();
        const queryEmbedding = embData?.data?.[0]?.embedding;
        if (queryEmbedding) {
          const { data, error } = await admin.rpc("match_user_memories", {
            p_user_id: userId,
            p_agent_id: agentId,
            p_query_embedding: queryEmbedding,
            p_match_count: k,
          });
          if (!error && Array.isArray(data)) memories = data;
        }
      }
    } catch (e) {
      console.error("[recall-memory] embed/match failed:", e);
    }

    // Fallback: if embedding/RPC returned nothing, pull recent high-importance memories the old way
    if (memories.length === 0) {
      const { data } = await admin
        .from("user_memories")
        .select("id, agent_id, category, content, emotion_tag, importance, created_at")
        .eq("user_id", userId)
        .eq("agent_id", agentId)
        .order("importance", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(k);
      memories = data || [];
    }

    // 2) Profile facts (cross-agent)
    const { data: facts } = await admin
      .from("user_profile_facts")
      .select("category, key, value, confidence, source_agent_id")
      .eq("user_id", userId)
      .gte("confidence", 0.6)
      .order("confidence", { ascending: false })
      .limit(40);

    return new Response(JSON.stringify({ memories, facts: facts || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recall-memory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
