// ElevenLabs TTS - speak agent message in character voice
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

type VoiceConfig = {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  speakerBoost?: boolean;
};

// Per-agent voice mapping — 调低 stability、调高 style，让声音更接近"真人在聊天"
// 关闭 speaker_boost 的角色会更松弛、不像广播
const VOICE_MAP: Record<string, { en: VoiceConfig; zh: VoiceConfig }> = {
  // Chloe — 温柔咖啡师，轻声细语带笑意
  barista: {
    en: { voiceId: "cgSgspJ2msm6clMCkdW9", stability: 0.35, similarityBoost: 0.75, style: 0.55, speed: 0.98, speakerBoost: false },
    zh: { voiceId: "4VZIsMPtgggwNg7OXbPY", stability: 0.32, similarityBoost: 0.78, style: 0.6,  speed: 0.98, speakerBoost: false },
  },
  // Jax — 退伍消防员，低沉松弛、带停顿
  jax: {
    en: { voiceId: "nPczCjzI2devNBz1zQrb", stability: 0.45, similarityBoost: 0.8,  style: 0.6,  speed: 0.97, speakerBoost: true },
    zh: { voiceId: "XA2bIQ92TabjGbpO2xRr", stability: 0.45, similarityBoost: 0.8,  style: 0.55, speed: 0.97, speakerBoost: true },
  },
  // Luna — 神秘但像耳边低语，不庄严
  mystic: {
    en: { voiceId: "XrExE9yKIg1WjnnlVkGX", stability: 0.4,  similarityBoost: 0.75, style: 0.7,  speed: 0.92, speakerBoost: true },
    zh: { voiceId: "B8gJV1IhpuegLxdpXFOE", stability: 0.4,  similarityBoost: 0.78, style: 0.7,  speed: 0.92, speakerBoost: true },
  },
  // Zoe — 闺蜜炸毛感，跳脱起伏大
  bestie: {
    en: { voiceId: "EXAVITQu4vr4xnSDxMaL", stability: 0.2,  similarityBoost: 0.75, style: 0.85, speed: 1.1,  speakerBoost: false },
    zh: { voiceId: "aMSt68OGf4xUZAnLpTU8", stability: 0.22, similarityBoost: 0.75, style: 0.85, speed: 1.1,  speakerBoost: false },
  },
};

const MAX_CHARS = 800;

// Strip markdown + game/easter-egg markers so TTS reads clean prose
function cleanForSpeech(text: string): string {
  return text
    .replace(/【[^】]*】/g, " ")
    .replace(/\*[^*]+\*/g, " ")
    .replace(/\[[A-Z_]+:[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/[*_~`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

// 检测文本主要语言：中文字符占非空白字符 >= 20% 视为中文
function detectLang(text: string): "zh" | "en" {
  const stripped = text.replace(/\s+/g, "");
  if (!stripped) return "en";
  const zhCount = (stripped.match(/[\u4e00-\u9fa5]/g) || []).length;
  return zhCount / stripped.length >= 0.2 ? "zh" : "en";
}

function pickModel(lang: "zh" | "en"): string {
  // 中文优先用 v3（韵律 + 情绪更自然），若账号未开通会自动 fallback
  return lang === "zh" ? "eleven_v3" : "eleven_multilingual_v2";
}

async function callElevenLabs(
  apiKey: string,
  voice: VoiceConfig,
  text: string,
  modelId: string,
  finalSpeed: number,
) {
  return fetch(
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
        model_id: modelId,
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const agentVoices = VOICE_MAP[agentId] ?? VOICE_MAP.barista;
    const text = cleanForSpeech(rawText);
    if (!text) {
      return new Response(JSON.stringify({ error: "Empty text after cleaning" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = detectLang(text);
    const voice = agentVoices[lang];
    const modelId = pickModel(lang);

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

    let elResp = await callElevenLabs(apiKey, voice, text, modelId, finalSpeed);

    // 若 v3 不可用（账号未开通 / 模型不存在 / voice 不兼容），自动回落
    if (!elResp.ok && lang === "zh" && modelId === "eleven_v3") {
      const errText = await elResp.clone().text().catch(() => "");
      console.warn("[tts-speak] eleven_v3 failed, falling back to multilingual_v2:", elResp.status, errText.slice(0, 200));
      if (elResp.status === 400 || elResp.status === 403 || elResp.status === 404 || elResp.status === 422) {
        elResp = await callElevenLabs(apiKey, voice, text, "eleven_multilingual_v2", finalSpeed);
      }
    }

    // 402 paid_plan_required：library voice 在免费账号不可用，回落到 premade 英文音色
    // （premade voice + multilingual_v2 在免费账号可用，且支持中文朗读）
    if (!elResp.ok && elResp.status === 402) {
      const errText = await elResp.clone().text().catch(() => "");
      console.warn("[tts-speak] 402 paid_plan_required, falling back to premade voice:", errText.slice(0, 200));
      const premadeVoice: VoiceConfig = { ...agentVoices.en, voiceId: agentVoices.en.voiceId };
      elResp = await callElevenLabs(apiKey, premadeVoice, text, "eleven_multilingual_v2", finalSpeed);
      // 若英文 voice 也是 library（402），再回落到 Sarah（明确 premade）
      if (!elResp.ok && elResp.status === 402) {
        const safe: VoiceConfig = { voiceId: "EXAVITQu4vr4xnSDxMaL", stability: 0.4, similarityBoost: 0.75, style: 0.4, speed: finalSpeed };
        elResp = await callElevenLabs(apiKey, safe, text, "eleven_multilingual_v2", finalSpeed);
      }
    }

    if (!elResp.ok) {
      const errText = await elResp.text();
      console.error("[tts-speak] ElevenLabs error", elResp.status, errText);
      let userMsg = "语音生成失败，请稍后再试";
      if (elResp.status === 401) userMsg = "语音服务认证失败";
      else if (elResp.status === 429) userMsg = "语音请求过多，请稍候再试";
      else if (elResp.status === 402) userMsg = "当前 ElevenLabs 账号需要升级才能使用该音色";
      return new Response(JSON.stringify({ error: userMsg }), {
        status: elResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
