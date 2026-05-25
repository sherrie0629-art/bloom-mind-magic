import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_BUCKET = "mbti-poster-art";

const MBTI_MOTIF: Record<string, string> = {
  INTJ: "a chess king on a starry strategic board with subtle architectural blueprint lines",
  INTP: "floating equations, a half-open book and a curious magnifying glass orbiting a small planet",
  ENTJ: "a tall castle silhouette with rising arrows and a bold compass pointing forward",
  ENTP: "a brain-shaped lightbulb sparking ideas, surrounded by paper airplanes",
  INFJ: "a single candle flame in a quiet temple, a gentle moon and rippling water",
  INFP: "floating poetry pages and pressed flowers around a crescent moon",
  ENFJ: "a warm hand guiding glowing little stars upward like a teacher and students",
  ENFP: "a vibrant burst of confetti, balloons and a sketchbook full of wild ideas",
  ISTJ: "an open pocket watch with precise gears and a stack of neatly tied scrolls",
  ISFJ: "a cozy knitted blanket, a teapot and a warmly lit window at dusk",
  ESTJ: "a strong oak tree with a banner, organized files and a clear horizon",
  ESFJ: "a long dinner table with candles, flowers and gifts being shared",
  ISTP: "a half-disassembled motorcycle engine with floating tools and a small spark",
  ISFP: "a painter's palette, drifting petals and a soft watercolor wash",
  ESTP: "a skateboard mid-air with motion lines, neon sparks and city lights",
  ESFP: "a microphone, party streamers and a disco ball raining colorful light",
};

const MBTI_TITLES: Record<string, string> = {
  INTJ: "The Architect", INTP: "The Thinker", ENTJ: "The Commander", ENTP: "The Debater",
  INFJ: "The Advocate", INFP: "The Mediator", ENFJ: "The Protagonist", ENFP: "The Campaigner",
  ISTJ: "The Logistician", ISFJ: "The Defender", ESTJ: "The Executive", ESFJ: "The Consul",
  ISTP: "The Virtuoso", ISFP: "The Adventurer", ESTP: "The Entrepreneur", ESFP: "The Entertainer",
};

const ALL_TYPES = Object.keys(MBTI_MOTIF);

const buildPrompt = (type: string) =>
  `Modern editorial illustration for MBTI ${type} "${MBTI_TITLES[type]}", featuring ${MBTI_MOTIF[type]}. Deep indigo and violet palette with one warm accent color (gold or coral), mix of geometric and organic shapes, intellectual yet poetic mood, hand-drawn linework with subtle paper texture. Square format, no text, no letters.`;

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const bin = atob(match[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType: match[1] };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateOne(type: string, admin: any, force: boolean, apiKey: string) {
  const objectPath = `mbti-${type}.png`;

  if (!force) {
    const { data: existing } = await admin.storage.from(CACHE_BUCKET).list("", { search: objectPath, limit: 1 });
    if (existing?.some((f: any) => f.name === objectPath)) return { type, status: "skipped" };
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: buildPrompt(type) }],
      modalities: ["image", "text"],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    return { type, status: "error", error: `${resp.status} ${t.slice(0, 200)}` };
  }

  const data = await resp.json();
  const aiImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!aiImageUrl?.startsWith("data:")) return { type, status: "error", error: "no image in response" };

  const { bytes, contentType } = dataUrlToBytes(aiImageUrl);
  const { error: upErr } = await admin.storage
    .from(CACHE_BUCKET)
    .upload(objectPath, bytes, { contentType, upsert: true });
  if (upErr) return { type, status: "error", error: upErr.message };

  return { type, status: "generated" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const requested: string[] = Array.isArray(body.types) && body.types.length > 0 ? body.types : ALL_TYPES;
    const force = !!body.force;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const results: any[] = [];
    for (const type of requested) {
      if (!MBTI_MOTIF[type]) { results.push({ type, status: "error", error: "unknown type" }); continue; }
      try {
        const r = await generateOne(type, admin, force, apiKey);
        results.push(r);
      } catch (e: any) {
        results.push({ type, status: "error", error: e?.message || String(e) });
      }
      await sleep(1500);
    }

    const summary = {
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
