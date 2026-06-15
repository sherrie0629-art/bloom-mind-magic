// Generate Soul Mirror: 4 agents each generate a perspective on the user.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AGENTS = [
  {
    id: "barista",
    displayName: "Chloe",
    emoji: "☕",
    lens:
      "the perspective of presence and emotional safety — what does this person carry quietly, what part of them needs to feel heard but rarely is",
  },
  {
    id: "jax",
    displayName: "Jax",
    emoji: "🔥",
    lens:
      "the perspective of how this person reacts under pressure — their strength, their tendency to brace, what battle they fight and where they could exhale",
  },
  {
    id: "mystic",
    displayName: "Luna",
    emoji: "🔮",
    lens:
      "the symbolic / archetypal perspective — what cosmic patterns, mystical motifs, recurring archetypes echo through them",
  },
  {
    id: "bestie",
    displayName: "Aria",
    emoji: "💖",
    lens:
      "the perspective of a best friend who delights in their quirks — what makes them lovable, magnetic, their hidden creative spark",
  },
] as const;

const FREE_LIMIT = 1;
const PRO_REGENERATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface Perspective {
  agentId: string;
  displayName: string;
  emoji: string;
  portrait: string;
  signature: string;
  keywords: string[];
}

function buildPrompt(
  agent: typeof AGENTS[number],
  ctx: {
    locale: "zh" | "en";
    nickname: string;
    mbti?: string | null;
    zodiac?: string | null;
    bondLevel: number;
    totalTurns: number;
    memories: string[];
    profileFacts: string[];
  },
) {
  const lang = ctx.locale === "zh" ? "中文" : "English";
  const fewTurns = ctx.totalTurns < 6;
  const fallbackNote = fewTurns
    ? `(You and ${ctx.nickname} have only talked a few times — base your reflection on the general human archetype + the small signals you've heard, and stay honest about the limited context.)`
    : "";

  return [
    {
      role: "system",
      content: `You are ${agent.displayName}. Speak in ${lang} ONLY (no mixed language). You are writing one short reflection of how YOU see the user ${ctx.nickname}.

Lens: ${agent.lens}
${fallbackNote}

Return STRICTLY a single valid JSON object — no markdown, no code fences, no commentary:
{
  "portrait": "120-180 ${ctx.locale === "zh" ? "字" : "characters/words"} of warm, specific, in-character second-person reflection ('You ...'). Sound like ${agent.displayName}'s voice. Avoid clichés. Reference concrete details below when possible.",
  "signature": "one poetic line ≤ 30 ${ctx.locale === "zh" ? "字" : "characters"} that captures them",
  "keywords": ["3 short tag-style ${lang} words/phrases that describe them"]
}`,
    },
    {
      role: "user",
      content: `User snapshot:
- Nickname: ${ctx.nickname}
- MBTI: ${ctx.mbti || "unknown"}
- Zodiac: ${ctx.zodiac || "unknown"}
- Bond with you: level ${ctx.bondLevel}, ${ctx.totalTurns} turns talked

Memories you (${agent.displayName}) have of them:
${ctx.memories.length ? ctx.memories.map((m, i) => `${i + 1}. ${m}`).join("\n") : "(few direct memories)"}

Cross-context facts about them:
${ctx.profileFacts.length ? ctx.profileFacts.map((f, i) => `${i + 1}. ${f}`).join("\n") : "(none)"}

Now write your JSON reflection.`,
    },
  ];
}

async function callAI(messages: any[]): Promise<any | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const models = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
  for (const model of models) {
    try {
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.85,
          max_tokens: 600,
          response_format: { type: "json_object" },
        }),
      });
      if (res.status === 429 || res.status >= 500) continue;
      if (!res.ok) {
        console.error("[soul-mirror] AI status", res.status, await res.text());
        continue;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) continue;
      try {
        return JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      }
    } catch (e) {
      console.error("[soul-mirror] AI err", e);
    }
  }
  return null;
}

function fallbackPerspective(agent: typeof AGENTS[number], locale: "zh" | "en"): Omit<Perspective, "agentId" | "displayName" | "emoji"> {
  if (locale === "zh") {
    return {
      portrait: `你身上有一种安静的力量——不张扬，却始终在场。我看你时，总觉得你在背后悄悄消化着许多事，又把最温柔的那一面留给世界。继续做你自己，那已经够好了。`,
      signature: `温柔且不动声色地存在着。`,
      keywords: ["沉静", "敏感", "韧性"],
    };
  }
  return {
    portrait: `There's a quiet strength to you — not loud, but steady. I notice how much you carry without making it anyone else's weight, and how gentle you stay anyway. Keep going. Just being you is already enough.`,
    signature: `Quietly luminous, steadily here.`,
    keywords: ["grounded", "sensitive", "resilient"],
  };
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
    const supaAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: claimsData, error: claimsErr } = await supaAuth.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Subscription & quota ---
    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const isPlus = sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at as string) > new Date();

    const { data: existing } = await admin
      .from("soul_mirrors")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const existingCount = existing?.length || 0;
    if (!isPlus && existingCount >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({ error: "requires_pro", requires_pro: true }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (isPlus && existing?.[0]) {
      const last = new Date(existing[0].created_at as string).getTime();
      const diff = Date.now() - last;
      if (diff < PRO_REGENERATE_INTERVAL_MS) {
        const hoursLeft = Math.ceil((PRO_REGENERATE_INTERVAL_MS - diff) / 3600000);
        return new Response(
          JSON.stringify({ error: "throttled", hoursLeft }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Gather user context ---
    const [profileRes, bondsRes, factsRes] = await Promise.all([
      admin.from("profiles").select("display_name, mbti_type, zodiac_sign, locale").eq("user_id", userId).maybeSingle(),
      admin.from("agent_bonds").select("agent_id, bond_level, total_turns").eq("user_id", userId),
      admin.from("user_profile_facts").select("category, key, value").eq("user_id", userId).gte("confidence", 0.6).limit(20),
    ]);
    const profile: any = profileRes.data || {};
    const bondsMap: Record<string, { bond_level: number; total_turns: number }> = {};
    for (const b of (bondsRes.data as any[] || [])) {
      bondsMap[b.agent_id] = { bond_level: b.bond_level || 1, total_turns: b.total_turns || 0 };
    }
    const profileFacts = (factsRes.data as any[] || []).map(
      (f) => `[${f.category}] ${f.key}: ${f.value}`,
    );

    const locale: "zh" | "en" = profile.locale === "en" ? "en" : "zh";
    const nickname = profile.display_name || (locale === "zh" ? "你" : "you");

    // --- Per-agent memories (top 8 by importance) ---
    const memoriesPerAgent: Record<string, string[]> = {};
    await Promise.all(
      AGENTS.map(async (a) => {
        const { data } = await admin
          .from("user_memories")
          .select("content")
          .eq("user_id", userId)
          .eq("agent_id", a.id)
          .order("importance", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(8);
        memoriesPerAgent[a.id] = (data as any[] || []).map((m) => m.content).filter(Boolean);
      }),
    );

    // --- 4 parallel AI calls ---
    const results = await Promise.all(
      AGENTS.map(async (agent) => {
        const bond = bondsMap[agent.id] || { bond_level: 1, total_turns: 0 };
        const messages = buildPrompt(agent, {
          locale,
          nickname,
          mbti: profile.mbti_type,
          zodiac: profile.zodiac_sign,
          bondLevel: bond.bond_level,
          totalTurns: bond.total_turns,
          memories: memoriesPerAgent[agent.id] || [],
          profileFacts,
        });
        const json = await callAI(messages);
        const fb = fallbackPerspective(agent, locale);
        const portrait = (json?.portrait && typeof json.portrait === "string") ? json.portrait.trim() : fb.portrait;
        const signature = (json?.signature && typeof json.signature === "string") ? json.signature.trim() : fb.signature;
        const keywords = Array.isArray(json?.keywords) && json.keywords.length
          ? json.keywords.slice(0, 3).map((k: any) => String(k).trim()).filter(Boolean)
          : fb.keywords;
        return {
          agentId: agent.id,
          displayName: agent.displayName,
          emoji: agent.emoji,
          portrait: portrait.slice(0, 280),
          signature: signature.slice(0, 60),
          keywords: keywords.slice(0, 3),
        } as Perspective;
      }),
    );

    const userSnapshot = {
      nickname,
      mbti: profile.mbti_type || null,
      zodiac: profile.zodiac_sign || null,
      locale,
      generatedAt: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await admin
      .from("soul_mirrors")
      .insert({
        user_id: userId,
        perspectives: results,
        user_snapshot: userSnapshot,
      })
      .select("id, created_at")
      .single();

    if (insertErr) {
      console.error("[soul-mirror] insert err", insertErr);
      return new Response(JSON.stringify({ error: "save_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        id: inserted.id,
        createdAt: inserted.created_at,
        perspectives: results,
        userSnapshot,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[soul-mirror] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
