import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_BUCKET = "mbti-poster-art";

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const contentType = match[1];
  const b64 = match[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType };
}

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

    const { prompt, cacheKey } = await req.json();

    // Service-role client for storage write (anon RLS only allows read).
    const adminClient = cacheKey
      ? createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
      : null;

    // 1) Cache hit fast-path
    if (cacheKey && adminClient) {
      const safeKey = String(cacheKey).replace(/[^a-zA-Z0-9_-]/g, "");
      const objectPath = `${safeKey}.png`;
      const { data: existing } = await adminClient.storage
        .from(CACHE_BUCKET)
        .list("", { search: objectPath, limit: 1 });
      if (existing && existing.some((f) => f.name === objectPath)) {
        const { data: urlData } = adminClient.storage.from(CACHE_BUCKET).getPublicUrl(objectPath);
        return new Response(JSON.stringify({ imageUrl: urlData.publicUrl, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2) Generate via AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Image gen error:", response.status, t);
      throw new Error("Image generation failed");
    }

    const data = await response.json();
    const aiImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!aiImageUrl) throw new Error("No image in response");

    // 3) Upload to cache (best-effort) and return CDN URL
    if (cacheKey && adminClient && aiImageUrl.startsWith("data:")) {
      try {
        const safeKey = String(cacheKey).replace(/[^a-zA-Z0-9_-]/g, "");
        const objectPath = `${safeKey}.png`;
        const { bytes, contentType } = dataUrlToBytes(aiImageUrl);
        const { error: upErr } = await adminClient.storage
          .from(CACHE_BUCKET)
          .upload(objectPath, bytes, { contentType, upsert: true });
        if (!upErr) {
          const { data: urlData } = adminClient.storage.from(CACHE_BUCKET).getPublicUrl(objectPath);
          return new Response(JSON.stringify({ imageUrl: urlData.publicUrl, cached: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Cache upload failed:", upErr);
      } catch (e) {
        console.error("Cache upload exception:", e);
      }
    }

    return new Response(JSON.stringify({ imageUrl: aiImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-poster-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
