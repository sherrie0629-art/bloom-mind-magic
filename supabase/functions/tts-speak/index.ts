// ElevenLabs TTS - speak agent message in character voice
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Voice mapping per agent (id -> voice config)
const VOICE_MAP: Record<string, { voiceId: string; stability: number; similarityBoost: number; style: number; speed: number }> = {
  // Chloe — quiet warm barista
  barista: { voiceId: "cgSgspJ2msm6clMCkdW9", stability: 0.65, similarityBoost: 0.75, style: 0.35, speed: 0.95 },
  // Jax — gruff retired firefighter (male, deep)
  jax: { voiceId: "nPczCjzI2devNBz1zQrb", stability: 0.7, similarityBoost: 0.8, style: 0.35, speed: 1.0 },
  // Luna — mystical mathematician
  mystic: { voiceId: "XrExE9yKIg1WjnnlVkGX", stability: 0.65, similarityBoost: 0.75, style: 0.55, speed: 0.92 },
  // Zoe — hype-woman bestie
  bestie: { voiceId: "EXAVITQu4vr4xnSDxMaL", stability: 0.35, similarityBoost: 0.8, style: 0.65, speed: 1.05 },
};

const MAX_CHARS = 800;

// Strip markdown + game/easter-egg markers so TTS reads clean prose
function cleanForSpeech(text: string): string {
  return text
    // remove easter-egg / shard markers
    .replace(/【[^】]*】/g, " ")
    // remove stage directions in *...*
    .replace(/\*[^*]+\*/g, " ")
    // remove game markers like [ATMOSPHERE: xxx] [ENERGY:+2] [BRANCH] {...} etc.
    .replace(/\[[A-Z_]+:[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    // remove markdown emphasis / code / headings
    .replace(/[*_~`#>]/g, "")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const agentId = String(body.agentId || "").trim();
    const rawText = String(body.text || "").trim();

    if (!agentId || !rawText) {
      return new Response(JSON.stringify({ error: "Missing agentId or text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voice = VOICE_MAP[agentId] ?? VOICE_MAP.barista;
    const text = cleanForSpeech(rawText);
    if (!text) {
      return new Response(JSON.stringify({ error: "Empty text after cleaning" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ElevenLabs not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSpeed = Number(body.speed);
    const finalSpeed = Number.isFinite(userSpeed) && userSpeed >= 0.7 && userSpeed <= 1.2
      ? Number((voice.speed * userSpeed).toFixed(2))
      : voice.speed;

    const elResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: voice.stability,
            similarity_boost: voice.similarityBoost,
            style: voice.style,
            use_speaker_boost: true,
            speed: Math.max(0.7, Math.min(1.2, finalSpeed)),
          },
        }),
      },
    );

    if (!elResp.ok) {
      const errText = await elResp.text();
      console.error("[tts-speak] ElevenLabs error", elResp.status, errText);
      let userMsg = "语音生成失败，请稍后再试";
      if (elResp.status === 401) userMsg = "语音服务认证失败";
      else if (elResp.status === 429) userMsg = "语音请求过多，请稍候再试";
      else if (elResp.status === 402) userMsg = "语音额度已用完";
      return new Response(JSON.stringify({ error: userMsg }), {
        status: elResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream MP3 back to client
    return new Response(elResp.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error("[tts-speak] uncaught", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
