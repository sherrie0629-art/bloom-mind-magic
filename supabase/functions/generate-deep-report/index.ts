import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const typeLabels: Record<string, string> = {
  mbti: "MBTI Personality",
  enneagram: "Enneagram",
  zodiac: "Zodiac",
  emotion: "Emotional Wellness",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Please sign in first" }), {
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
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { assessmentId } = await req.json();
    if (!assessmentId) throw new Error("Missing assessmentId");

    const { data: assessment, error: fetchErr } = await supabase
      .from("assessment_results")
      .select("*")
      .eq("id", assessmentId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !assessment) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultData = assessment.result_data as any;

    if (resultData.deepReport) {
      return new Response(JSON.stringify({ deepReport: resultData.deepReport }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Plus subscription
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .single();

    const isPlus = sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at) > new Date();

    if (!isPlus) {
      return new Response(JSON.stringify({ error: "Plus membership required", needUpgrade: true }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily deep report limit
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("id, deep_report_count")
      .eq("user_id", userId)
      .eq("track_date", today)
      .single();

    const currentCount = usage?.deep_report_count || 0;
    if (currentCount >= 1) {
      return new Response(JSON.stringify({ error: "Daily deep report limit reached (1/day). Come back tomorrow! 🌙", dailyLimitReached: true }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = typeLabels[assessment.assessment_type] || assessment.assessment_type;
    const resultSummary = JSON.stringify(resultData, null, 2);

    const systemPrompt = `You are a senior psychologist and personality analysis expert with 20 years of experience. Based on the user's ${typeLabel} assessment results, generate a 3,000–5,000 word deep psychological analysis report.

The report must include the following sections (in markdown format):

## 📋 Core Personality Profile
In-depth analysis of the user's core personality traits, including both overt and covert characteristics.

## 🧒 Childhood Attachment Pattern Analysis
Based on personality traits, infer likely childhood attachment style (secure, anxious, avoidant, or disorganized) and analyze its impact on current relationships.

## 💕 Relationship Red Flags Guide
Analyze common pitfalls in romantic relationships and provide specific, actionable advice. Include:
- Types of partners they tend to attract
- Common conflict patterns in relationships
- How to establish healthy boundaries

## 🛡️ Core Defense Mechanisms
Analyze commonly used psychological defense mechanisms (rationalization, projection, repression, etc.) and how they affect daily decisions.

## 💼 Career Development Insights
Based on personality traits, analyze the most suitable career directions and work environments.

## 🌱 Personal Growth Roadmap
Provide specific self-improvement suggestions and exercises.

## 🔮 Summary & Outlook
Overall summary and positive outlook for the future.

Requirements:
- Warm, professional, and insightful tone
- Use specific examples and metaphors
- Avoid generic advice; give concrete, actionable steps
- Use emojis sparingly for readability
- Write in English`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are the user's ${typeLabel} assessment results:\n\n${resultSummary}\n\nPlease generate the deep analysis report.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, please try again later 🌙" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted 💫" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service temporarily unavailable");
    }

    const aiData = await response.json();
    const deepReport = aiData.choices?.[0]?.message?.content || "";

    // Save report and increment usage
    await supabase
      .from("assessment_results")
      .update({ result_data: { ...resultData, deepReport } })
      .eq("id", assessmentId);

    // Increment deep_report_count
    if (usage) {
      await supabase
        .from("usage_tracking")
        .update({ deep_report_count: currentCount + 1 })
        .eq("id", usage.id);
    } else {
      await supabase
        .from("usage_tracking")
        .insert({ user_id: userId, track_date: today, chat_count: 0, assessment_count: 0, deep_report_count: 1 });
    }

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
