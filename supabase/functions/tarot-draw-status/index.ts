import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const BUCKET = "tarot-card-art";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { drawId } = await req.json();
    if (!drawId) {
      return new Response(JSON.stringify({ error: "Missing drawId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: draw } = await supabase
      .from("tarot_draws")
      .select("image_path, image_status")
      .eq("id", drawId)
      .eq("user_id", user.id)
      .single();

    if (!draw) {
      return new Response(JSON.stringify({ error: "Draw not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let imageUrl: string | null = null;
    if (draw.image_status === "ready" && draw.image_path) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(draw.image_path, 3600);
      imageUrl = signed?.signedUrl || null;
    }

    return new Response(JSON.stringify({ imageStatus: draw.image_status, imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tarot-draw-status error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
