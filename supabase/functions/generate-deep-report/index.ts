import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOUBAO_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

const typeLabels: Record<string, string> = {
  mbti: "MBTI人格",
  bazi: "八字命理",
  zodiac: "星座运势",
  emotion: "情绪状态",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "请先登录" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "认证失败" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { assessmentId } = await req.json();
    if (!assessmentId) throw new Error("缺少 assessmentId");

    const { data: assessment, error: fetchErr } = await supabase
      .from("assessment_results")
      .select("*")
      .eq("id", assessmentId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !assessment) {
      return new Response(JSON.stringify({ error: "报告不存在" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultData = assessment.result_data as any;

    if (resultData.deepReport) {
      return new Response(JSON.stringify({ deepReport: resultData.deepReport }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .single();

    const isPremium = sub?.plan === "premium" && sub?.expires_at && new Date(sub.expires_at) > new Date();

    if (!isPremium) {
      const { data: purchase } = await supabase
        .from("purchase_records")
        .select("id, status")
        .eq("user_id", userId)
        .eq("product_type", "deep_report")
        .eq("product_id", assessmentId)
        .eq("status", "completed")
        .single();

      if (!purchase) {
        return new Response(JSON.stringify({ error: "需要付费解锁", needPayment: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const apiKey = Deno.env.get("DOUBAO_API_KEY")!;
    const model = Deno.env.get("DOUBAO_ENDPOINT_ID")!;

    const typeLabel = typeLabels[assessment.assessment_type] || assessment.assessment_type;
    const resultSummary = JSON.stringify(resultData, null, 2);

    const systemPrompt = `你是一位拥有20年经验的资深心理咨询师和人格分析专家。你需要基于用户的${typeLabel}测评结果，生成一份3000-5000字的深度心理分析报告。

报告必须包含以下章节（用markdown格式）：

## 📋 核心性格画像
深入分析用户的核心性格特质，包括显性特征和隐性特征。

## 🧒 童年依恋模式分析
基于人格特质推断可能的童年依恋风格（安全型、焦虑型、回避型或混乱型），分析其对当前人际关系的影响。

## 💕 亲密关系避坑指南
分析在恋爱中容易踩的雷区，提供具体可操作的建议。包括：
- 容易吸引的伴侣类型
- 关系中常见的冲突模式
- 如何建立健康的边界

## 🛡️ 核心心理防御机制
分析常用的心理防御机制（如合理化、投射、压抑等），以及这些机制如何影响日常决策。

## 💼 职业发展深度建议
基于性格特质分析最适合的职业方向和工作环境。

## 🌱 个人成长路径
提供具体的自我提升建议和练习方法。

## 🔮 总结与展望
整体总结和对未来的积极展望。

要求：
- 语言温暖、专业、有深度
- 多使用具体案例和比喻
- 避免笼统的建议，给出可执行的具体行动
- 适当使用emoji增加可读性
- 中文输出`;

    const response = await fetch(DOUBAO_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `以下是用户的${typeLabel}测评结果数据：\n\n${resultSummary}\n\n请生成深度分析报告。` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求太频繁，请稍后再试 🌙" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度已用尽 💫" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI 服务暂时不可用");
    }

    const aiData = await response.json();
    const deepReport = aiData.choices?.[0]?.message?.content || "";

    await supabase
      .from("assessment_results")
      .update({ result_data: { ...resultData, deepReport } })
      .eq("id", assessmentId);

    return new Response(JSON.stringify({ deepReport }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-deep-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
