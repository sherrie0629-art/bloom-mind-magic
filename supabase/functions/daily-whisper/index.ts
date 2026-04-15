import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

function fetchAI(model: string, requestBody: Record<string, unknown>): Promise<Response> {
  return fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...requestBody, model }) });
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
    const { data: { user }, error: authError } = await createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    if (action === "monthly-report") return await handleMonthlyReport(supabaseUser, user.id);

    if (action === "check-image") {
      const { whisper_id } = body;
      if (!whisper_id) throw new Error("Missing whisper_id");
      const { data } = await supabaseUser.from("daily_whispers").select("image_url").eq("id", whisper_id).eq("user_id", user.id).single();
      let imageUrl = data?.image_url || null;
      if (imageUrl && !imageUrl.startsWith("http")) {
        const { data: signedData } = await supabaseUser.storage.from("whisper-images").createSignedUrl(imageUrl, 3600);
        imageUrl = signedData?.signedUrl || null;
      }
      return new Response(JSON.stringify({ imageUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Tarot card interpretation =====
    const { cardId, cardName, cardNameEn, isReversed, keywords } = body;
    if (cardId === undefined || !cardName) throw new Error("Missing card info");

    const position = isReversed ? "逆位" : "正位";
    const keywordsStr = (keywords || []).join("、");

    const whisperResp = await fetchAI("google/gemini-3-flash-preview", {
      messages: [
        { role: "system", content: `你是一位融合荣格心理学与塔罗智慧的心灵导师。你的解读风格温暖、有洞察力，善于用心理学概念（如原型、阴影、集体无意识）来解释塔罗牌的象征意义。你的目标是帮助用户理解当下的情绪状态，获得心理层面的启发。` },
        { role: "user", content: `我抽到了塔罗牌"${cardName}"（${cardNameEn}），${position}。关键词：${keywordsStr}。

请用心理学视角为我解读这张牌对今日情绪的启示。要求：
1. 先简述牌面的心理学象征含义（2-3句）
2. 再结合${position}含义，给出今日情绪启示（3-4句）
3. 整体不超过200字，温暖有深度
4. 最后另起一行，以"💡 "开头给出一句简短的今日行动建议（15字以内）

请直接输出解读内容，不要加标题或分隔符。` },
      ],
    });

    if (!whisperResp.ok) {
      if (whisperResp.status === 429) return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (whisperResp.status === 402) return new Response(JSON.stringify({ error: "额度已用完" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Whisper generation failed");
    }
    const whisperData = await whisperResp.json();
    const fullText = whisperData.choices?.[0]?.message?.content?.trim() || "每一张牌都是镜子，映照此刻的你。";

    // Split whisper and action tip
    const tipMatch = fullText.match(/\n\n?💡\s*(.+)/);
    const whisper = tipMatch ? fullText.slice(0, tipMatch.index).trim() : fullText;
    const actionTip = tipMatch ? tipMatch[1].trim() : "给自己一个温柔的拥抱";

    // Ask AI to score mood 1-5 based on card
    const moodScoreResp = await fetchAI("google/gemini-2.5-flash-lite", {
      messages: [
        { role: "user", content: `塔罗牌"${cardName}"${position}，关键词：${keywordsStr}。请给出一个1-5的情绪能量分数（1=低落消极，5=积极充沛）。只回复数字。` },
      ],
    });
    let moodScore = 3;
    if (moodScoreResp.ok) {
      const scoreData = await moodScoreResp.json();
      const scoreText = scoreData.choices?.[0]?.message?.content?.trim();
      const parsed = parseInt(scoreText);
      if (parsed >= 1 && parsed <= 5) moodScore = parsed;
    }

    const contentStr = `${cardName}（${position}）`;
    const inputTextStr = `card:${cardId},reversed:${isReversed}`;

    const { data: insertedRow, error: insertError } = await supabaseUser.from("daily_whispers").insert({
      user_id: user.id,
      content: contentStr,
      input_text: inputTextStr,
      whisper: `${whisper}\n\n💡 ${actionTip}`,
      image_url: null,
      mood_emoji: null,
      mood_word: cardName,
      mood_score: moodScore,
    }).select("id").single();
    if (insertError) console.error("Insert error:", insertError);
    const whisperId = insertedRow?.id || null;

    // Generate tarot card art asynchronously
    const imagePrompt = `Create a mystical tarot card illustration for "${cardNameEn}" (${position === "逆位" ? "reversed" : "upright"}). Style: ethereal watercolor with gold accents, dreamy cosmic atmosphere, rich symbolism. The card should evoke ${keywordsStr}. Mystical, elegant, NO TEXT. Square format.`;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const imagePromise = generateAndSaveImage(LOVABLE_API_KEY, supabaseUser, user.id, whisperId, imagePrompt);
    try { if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) { (EdgeRuntime as any).waitUntil(imagePromise); } } catch {}

    return new Response(JSON.stringify({ whisper, actionTip, imageUrl: null, whisperId, moodScore }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("daily-whisper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function generateAndSaveImage(apiKey: string, supabase: any, userId: string, whisperId: string | null, imagePrompt: string) {
  try {
    const imageResp = await fetch(AI_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "google/gemini-3.1-flash-image-preview", messages: [{ role: "user", content: imagePrompt }], modalities: ["image", "text"] }) });
    if (!imageResp.ok) { console.error("Image generation failed:", imageResp.status); return; }
    const imageData = await imageResp.json();
    const base64Url = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!base64Url) return;
    const base64Data = base64Url.split(",")[1]; if (!base64Data) return;
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `${userId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from("whisper-images").upload(fileName, binaryData, { contentType: "image/png", upsert: false });
    if (uploadError) { console.error("Upload error:", uploadError); return; }
    if (whisperId) { await supabase.from("daily_whispers").update({ image_url: fileName }).eq("id", whisperId); }
  } catch (err) { console.error("Image processing error:", err); }
}

async function handleMonthlyReport(supabaseUser: any, userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: records } = await supabaseUser.from("daily_whispers").select("*").eq("user_id", userId).gte("created_at", startOfMonth).order("created_at", { ascending: true });
  if (!records || records.length === 0) {
    return new Response(JSON.stringify({ error: "本月还没有签到记录，先去抽一张塔罗牌吧！" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const summary = records.map((r: any) => {
    const d = new Date(r.created_at);
    return `${d.getMonth() + 1}/${d.getDate()}: ${r.content || ""} (能量 ${r.mood_score || "N/A"}/5) ${r.input_text ? `${r.mood_word || ""}` : ""}`;
  }).join("\n");

  const reportResp = await fetchAI("google/gemini-3-flash-preview", {
    messages: [
      { role: "system", content: `你是"Dr. Maya"，一位融合荣格心理学与塔罗智慧的情绪导师。请用心理学视角为用户撰写一封月度情绪信件。你的风格如同一封手写信——温暖、真诚、有洞察力。你需要：
1. 肯定并庆祝他们坚持每日塔罗仪式的行为
2. 从塔罗牌组合中识别情绪模式和心理主题
3. 对低谷时刻给予深切的共情
4. 真诚地赞美高光时刻
5. 给出 1-2 个温暖而具体的自我关怀建议
格式：以"亲爱的朋友，"开头，以 Dr. Maya 的温暖签名结尾。300-500 字。全程中文。` },
      { role: "user", content: `以下是我本月的塔罗签到记录（共 ${records.length} 天）：\n${summary}\n\n请为我撰写月度情绪报告。` },
    ],
    stream: true,
  });
  if (!reportResp.ok) {
    if (reportResp.status === 429) return new Response(JSON.stringify({ error: "请求过于频繁" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (reportResp.status === 402) return new Response(JSON.stringify({ error: "额度已用完" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error("Report generation failed");
  }
  return new Response(reportResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}
