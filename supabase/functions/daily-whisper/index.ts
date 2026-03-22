import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOUBAO_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const SEEDREAM_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

async function callDoubao(body: Record<string, unknown>, isStream = false): Promise<Response> {
  const apiKey = Deno.env.get("DOUBAO_API_KEY")!;
  const model = isStream ? Deno.env.get("DOUBAO_STREAM_ENDPOINT_ID")! : Deno.env.get("DOUBAO_ENDPOINT_ID")!;
  return fetch(DOUBAO_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    // ===== Monthly report branch =====
    if (action === "monthly-report") {
      return await handleMonthlyReport(supabaseUser, user.id);
    }

    // ===== Check image status branch =====
    if (action === "check-image") {
      const { whisper_id } = body;
      if (!whisper_id) throw new Error("Missing whisper_id");
      const { data } = await supabaseUser
        .from("daily_whispers")
        .select("image_url")
        .eq("id", whisper_id)
        .eq("user_id", user.id)
        .single();
      return new Response(JSON.stringify({ imageUrl: data?.image_url || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Default: generate whisper =====
    const { inputText, inputImageBase64, moodEmoji, moodWord, moodScore } = body;

    const whisperContent: any[] = [];
    const moodContext = moodEmoji ? `用户选择的情绪表情是${moodEmoji}，情绪关键词是「${moodWord || ""}」，情绪指数${moodScore}/5。` : "";

    if (inputImageBase64) {
      whisperContent.push({
        type: "image_url",
        image_url: { url: inputImageBase64 },
      });
      whisperContent.push({
        type: "text",
        text: `${moodContext}${inputText ? `用户此刻的心情是：「${inputText}」，` : ""}结合这张图片，为用户生成一句专属的心灵密语。要求：富有诗意、温暖治愈、不超过40个字。只返回密语本身，不要任何额外文字。`,
      });
    } else {
      whisperContent.push({
        type: "text",
        text: `${moodContext}用户此刻的心情/想法是：「${inputText || "没有特别的想法"}」。请根据这些信息，为用户生成一句专属的心灵密语。要求：富有诗意、温暖治愈、不超过40个字。只返回密语本身，不要任何额外文字。`,
      });
    }

    // Step 1: Generate whisper text
    const whisperResp = await callDoubao({
      messages: [
        { role: "system", content: "你是一位充满智慧和温度的心灵导师，擅长用简短而深刻的语言触动人心。你的风格融合了东方禅意与现代治愈感。" },
        { role: "user", content: whisperContent },
      ],
    });

    if (!whisperResp.ok) {
      const status = whisperResp.status;
      if (status === 429) return new Response(JSON.stringify({ error: "请求太频繁，请稍后再试" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "服务额度不足" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Whisper generation failed");
    }

    const whisperData = await whisperResp.json();
    const whisper = whisperData.choices?.[0]?.message?.content?.trim() || "允许自己慢下来，也是一种温柔。";

    // Step 2: Save to database immediately (without image)
    const { data: insertedRow, error: insertError } = await supabaseUser.from("daily_whispers").insert({
      user_id: user.id,
      input_text: inputText || null,
      whisper,
      image_url: null,
      mood_emoji: moodEmoji || null,
      mood_word: moodWord || null,
      mood_score: moodScore || null,
    }).select("id").single();

    if (insertError) console.error("Insert error:", insertError);

    const whisperId = insertedRow?.id || null;

    // Step 3: Generate image in background using Seedream
    const moodDesc = moodWord || inputText || (moodEmoji ? `feeling ${moodEmoji}` : "peaceful contemplation");
    const scoreDesc = moodScore
      ? moodScore <= 2 ? "melancholic, tender, with gentle comfort"
        : moodScore <= 3 ? "calm, serene, with quiet introspection"
        : "warm, hopeful, with gentle joy"
      : "peaceful and contemplative";
    const imagePrompt = `Create an elegant, healing illustration for someone feeling "${moodDesc}". Mood: ${scoreDesc}. Style: soft dreamy watercolor with gentle light, ethereal atmosphere, warm muted palette of ivory, soft gold, pale lavender, and dusty rose. Abstract and poetic — like a visual lullaby. NO TEXT. Square format, high quality.`;

    const imagePromise = generateAndSaveImage(
      supabaseUser, user.id, whisperId, imagePrompt
    );

    try {
      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(imagePromise);
      }
    } catch {
      // Fallback: just let it run
    }

    return new Response(JSON.stringify({ whisper, imageUrl: null, whisperId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-whisper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateAndSaveImage(
  supabase: any, userId: string, whisperId: string | null, imagePrompt: string
) {
  try {
    const imageApiKey = Deno.env.get("DOUBAO_IMAGE_API_KEY")!;
    const imageModel = Deno.env.get("DOUBAO_IMAGE_ENDPOINT_ID")!;

    const imageResp = await fetch(SEEDREAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageModel,
        prompt: imagePrompt,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!imageResp.ok) {
      console.error("Seedream image generation failed:", imageResp.status);
      return;
    }

    const imageData = await imageResp.json();
    const base64Data = imageData.data?.[0]?.b64_json;
    if (!base64Data) return;

    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `${userId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("whisper-images")
      .upload(fileName, binaryData, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return;
    }

    const { data: urlData } = supabase.storage.from("whisper-images").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    if (whisperId) {
      const { error: updateError } = await supabase
        .from("daily_whispers")
        .update({ image_url: imageUrl })
        .eq("id", whisperId);
      if (updateError) console.error("Update image URL error:", updateError);
    }
  } catch (err) {
    console.error("Image processing error:", err);
  }
}

async function handleMonthlyReport(supabaseUser: any, userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: records } = await supabaseUser
    .from("daily_whispers")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth)
    .order("created_at", { ascending: true });

  if (!records || records.length === 0) {
    return new Response(JSON.stringify({ error: "本月还没有情绪签到记录，先去记录一下吧" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary = records.map((r: any) => {
    const d = new Date(r.created_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
    return `${d}: ${r.mood_emoji || ""} ${r.mood_word || ""} (情绪指数${r.mood_score || "未知"}/5) ${r.input_text ? `备注:${r.input_text}` : ""}`;
  }).join("\n");

  const reportResp = await callDoubao({
    messages: [
      {
        role: "system",
        content: `你是"暖暖"，一位极度温柔、充满同理心的心理咨询师。你的风格像一封手写信——温暖、真诚、有诗意。你会：
1. 先肯定用户坚持记录情绪的行为本身
2. 分析本月情绪趋势（高光时刻、低谷时期）
3. 对低谷时期表达深切的理解和关怀
4. 对高光时刻给予真诚的庆祝
5. 最后给出1-2条温暖、具体的建议
格式：以"亲爱的朋友"开头，以暖暖的署名结尾。全文控制在300-500字。`,
      },
      {
        role: "user",
        content: `以下是我本月的情绪签到记录，共${records.length}天：\n${summary}\n\n请为我写一封本月情绪解读信。`,
      },
    ],
    stream: true,
  }, true);

  if (!reportResp.ok) {
    const status = reportResp.status;
    if (status === 429) return new Response(JSON.stringify({ error: "请求太频繁，请稍后再试" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (status === 402) return new Response(JSON.stringify({ error: "服务额度不足" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error("Monthly report generation failed");
  }

  return new Response(reportResp.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}
