// Prefill all tarot card art into the shared cache (tarot_card_art + tarot-card-art bucket).
// Admin-only. Mirrors prefill-mbti-posters style.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BUCKET = "tarot-card-art";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CARDS: { id: number; name: string; upright: string[]; reversed: string[] }[] = [
  { id: 0, name: "The Fool", upright: ["New beginnings", "Freedom", "Adventure"], reversed: ["Recklessness", "Hesitation", "Fear"] },
  { id: 1, name: "The Magician", upright: ["Creativity", "Willpower", "Focus"], reversed: ["Deception", "Lack of skill", "Lost"] },
  { id: 2, name: "The High Priestess", upright: ["Intuition", "Wisdom", "Inner voice"], reversed: ["Ignored intuition", "Secrecy", "Superficiality"] },
  { id: 3, name: "The Empress", upright: ["Abundance", "Nurturing", "Sensuality"], reversed: ["Codependency", "Creative block", "Self-neglect"] },
  { id: 4, name: "The Emperor", upright: ["Authority", "Structure", "Stability"], reversed: ["Controlling", "Rigid", "Lack of discipline"] },
  { id: 5, name: "The Hierophant", upright: ["Tradition", "Faith", "Guidance"], reversed: ["Rebellion", "Dogma", "Blind conformity"] },
  { id: 6, name: "The Lovers", upright: ["Love", "Harmony", "Choices"], reversed: ["Discord", "Imbalance", "Value conflict"] },
  { id: 7, name: "The Chariot", upright: ["Victory", "Determination", "Drive"], reversed: ["Loss of control", "Directionless", "Aggression"] },
  { id: 8, name: "Strength", upright: ["Inner strength", "Courage", "Gentleness"], reversed: ["Self-doubt", "Vulnerability", "Suppressed emotions"] },
  { id: 9, name: "The Hermit", upright: ["Introspection", "Solitude", "Seeking truth"], reversed: ["Isolation", "Avoidance", "Withdrawal"] },
  { id: 10, name: "Wheel of Fortune", upright: ["Change", "Opportunity", "Destiny"], reversed: ["Resisting change", "Bad luck", "Loss of control"] },
  { id: 11, name: "Justice", upright: ["Fairness", "Karma", "Truth"], reversed: ["Injustice", "Avoiding responsibility", "Bias"] },
  { id: 12, name: "The Hanged Man", upright: ["Surrender", "New perspective", "Patience"], reversed: ["Procrastination", "Pointless sacrifice", "Stubbornness"] },
  { id: 13, name: "Death", upright: ["Transformation", "Endings & rebirth", "Letting go"], reversed: ["Resisting change", "Stagnation", "Fear"] },
  { id: 14, name: "Temperance", upright: ["Balance", "Patience", "Moderation"], reversed: ["Extremes", "Imbalance", "Impatience"] },
  { id: 15, name: "The Devil", upright: ["Bondage", "Desire", "Shadow self"], reversed: ["Liberation", "Awakening", "Breaking free"] },
  { id: 16, name: "The Tower", upright: ["Upheaval", "Revelation", "Breaking down"], reversed: ["Avoiding disaster", "Fear of change", "Delayed collapse"] },
  { id: 17, name: "The Star", upright: ["Hope", "Inspiration", "Serenity"], reversed: ["Disappointment", "Lack of faith", "Disconnected"] },
  { id: 18, name: "The Moon", upright: ["Illusion", "Subconscious", "Intuition"], reversed: ["Clarity", "Facing fears", "Release of anxiety"] },
  { id: 19, name: "The Sun", upright: ["Joy", "Success", "Vitality"], reversed: ["Temporary sadness", "Over-optimism", "Delayed gratification"] },
  { id: 20, name: "Judgement", upright: ["Awakening", "Rebirth", "Inner calling"], reversed: ["Self-criticism", "Refusing growth", "Indecision"] },
  { id: 21, name: "The World", upright: ["Completion", "Achievement", "Fulfillment"], reversed: ["Incomplete", "Lack of closure", "Stagnation"] },
  // Wands
  { id: 22, name: "Ace of Wands", upright: ["Inspiration", "Innovation", "Passion"], reversed: ["Delays", "Lack of direction", "Creative block"] },
  { id: 23, name: "Two of Wands", upright: ["Planning", "Decisions", "Vision"], reversed: ["Fear of unknown", "Poor planning", "Hesitation"] },
  { id: 24, name: "Three of Wands", upright: ["Expansion", "Foresight", "Progress"], reversed: ["Setbacks", "Delays", "Narrow vision"] },
  { id: 25, name: "Four of Wands", upright: ["Celebration", "Harmony", "Belonging"], reversed: ["Instability", "Conflict", "Lack of belonging"] },
  { id: 26, name: "Five of Wands", upright: ["Competition", "Conflict", "Challenge"], reversed: ["Avoiding conflict", "Inner tension", "Resolution"] },
  { id: 27, name: "Six of Wands", upright: ["Victory", "Recognition", "Confidence"], reversed: ["Fear of failure", "Lack of recognition", "Self-doubt"] },
  { id: 28, name: "Seven of Wands", upright: ["Perseverance", "Defense", "Courage"], reversed: ["Giving in", "Exhaustion", "Surrender"] },
  { id: 29, name: "Eight of Wands", upright: ["Swift action", "Progress", "Messages"], reversed: ["Delays", "Obstacles", "Rushing"] },
  { id: 30, name: "Nine of Wands", upright: ["Resilience", "Persistence", "Last stand"], reversed: ["Burnout", "Paranoia", "Giving up"] },
  { id: 31, name: "Ten of Wands", upright: ["Burden", "Responsibility", "Overload"], reversed: ["Release", "Delegation", "Collapse"] },
  { id: 32, name: "Page of Wands", upright: ["Exploration", "Enthusiasm", "Curiosity"], reversed: ["Directionless", "Impulsive", "Fleeting interest"] },
  { id: 33, name: "Knight of Wands", upright: ["Adventure", "Energy", "Action"], reversed: ["Reckless", "Arrogant", "Scattered energy"] },
  { id: 34, name: "Queen of Wands", upright: ["Confidence", "Charisma", "Independence"], reversed: ["Jealousy", "Selfishness", "Insecurity"] },
  { id: 35, name: "King of Wands", upright: ["Leadership", "Vision", "Boldness"], reversed: ["Domineering", "Impulsive", "Unrealistic expectations"] },
  // Cups
  { id: 36, name: "Ace of Cups", upright: ["New love", "Intuition", "Emotional flow"], reversed: ["Emotional block", "Emptiness", "Repressed feelings"] },
  { id: 37, name: "Two of Cups", upright: ["Partnership", "Connection", "Understanding"], reversed: ["Imbalance", "Separation", "Misunderstanding"] },
  { id: 38, name: "Three of Cups", upright: ["Friendship", "Community", "Celebration"], reversed: ["Isolation", "Overindulgence", "Gossip"] },
  { id: 39, name: "Four of Cups", upright: ["Contemplation", "Reevaluation", "Apathy"], reversed: ["Awakening", "New opportunity", "Stepping out"] },
  { id: 40, name: "Five of Cups", upright: ["Loss", "Grief", "Regret"], reversed: ["Acceptance", "Moving on", "Finding hope"] },
  { id: 41, name: "Six of Cups", upright: ["Nostalgia", "Innocence", "Warm memories"], reversed: ["Stuck in past", "Immaturity", "Clinging"] },
  { id: 42, name: "Seven of Cups", upright: ["Fantasy", "Choices", "Imagination"], reversed: ["Disillusion", "Temptation", "Need for clarity"] },
  { id: 43, name: "Eight of Cups", upright: ["Walking away", "Seeking depth", "Letting go"], reversed: ["Avoidance", "Fear of leaving", "Aimless"] },
  { id: 44, name: "Nine of Cups", upright: ["Contentment", "Wish fulfilled", "Gratitude"], reversed: ["Greed", "Dissatisfaction", "Materialism"] },
  { id: 45, name: "Ten of Cups", upright: ["Happiness", "Family harmony", "Fulfillment"], reversed: ["Family conflict", "Broken dreams", "Disharmony"] },
  { id: 46, name: "Page of Cups", upright: ["Creative spark", "Intuition", "Emotional message"], reversed: ["Emotional immaturity", "Escapism", "Creative block"] },
  { id: 47, name: "Knight of Cups", upright: ["Romance", "Charm", "Following the heart"], reversed: ["Unrealistic", "Jealousy", "Moodiness"] },
  { id: 48, name: "Queen of Cups", upright: ["Empathy", "Compassion", "Deep intuition"], reversed: ["Codependency", "Martyrdom", "Poor boundaries"] },
  { id: 49, name: "King of Cups", upright: ["Emotional maturity", "Calm", "Wisdom"], reversed: ["Emotional repression", "Manipulation", "Coldness"] },
  // Swords
  { id: 50, name: "Ace of Swords", upright: ["Clarity", "Truth", "Breakthrough"], reversed: ["Confusion", "Miscommunication", "Lack of clarity"] },
  { id: 51, name: "Two of Swords", upright: ["Dilemma", "Stalemate", "Inner conflict"], reversed: ["Information overload", "Anxiety", "Delayed decision"] },
  { id: 52, name: "Three of Swords", upright: ["Heartbreak", "Sorrow", "Loss"], reversed: ["Healing", "Releasing pain", "Forgiveness"] },
  { id: 53, name: "Four of Swords", upright: ["Rest", "Recovery", "Meditation"], reversed: ["Restlessness", "Overwork", "Forced action"] },
  { id: 54, name: "Five of Swords", upright: ["Conflict", "Defeat", "Selfishness"], reversed: ["Reconciliation", "Letting go", "Lesson learned"] },
  { id: 55, name: "Six of Swords", upright: ["Transition", "Moving on", "Calm waters"], reversed: ["Resisting change", "Unfinished business", "Old wounds"] },
  { id: 56, name: "Seven of Swords", upright: ["Strategy", "Going solo", "Resourcefulness"], reversed: ["Exposed deceit", "Avoiding consequences", "Self-deception"] },
  { id: 57, name: "Eight of Swords", upright: ["Trapped", "Self-limiting", "Powerlessness"], reversed: ["Freedom", "New perspective", "Empowerment"] },
  { id: 58, name: "Nine of Swords", upright: ["Anxiety", "Nightmares", "Worry"], reversed: ["Relief", "Facing fears", "Recovery"] },
  { id: 59, name: "Ten of Swords", upright: ["Rock bottom", "Ending", "New dawn"], reversed: ["Recovery", "Resisting endings", "Lingering"] },
  { id: 60, name: "Page of Swords", upright: ["Curiosity", "Thinking", "Truth-seeking"], reversed: ["Cynicism", "Gossip", "Overthinking"] },
  { id: 61, name: "Knight of Swords", upright: ["Decisive", "Swift", "Ambitious"], reversed: ["Reckless", "Hurtful words", "Impulsive action"] },
  { id: 62, name: "Queen of Swords", upright: ["Perceptive", "Independent", "Direct"], reversed: ["Cold", "Biased", "Emotionally closed"] },
  { id: 63, name: "King of Swords", upright: ["Rational", "Authority", "Integrity"], reversed: ["Tyrannical", "Ruthless", "Abuse of power"] },
  // Pentacles
  { id: 64, name: "Ace of Pentacles", upright: ["New opportunity", "Prosperity", "Grounded"], reversed: ["Missed chance", "Poor planning", "Greed"] },
  { id: 65, name: "Two of Pentacles", upright: ["Balance", "Flexibility", "Multitasking"], reversed: ["Imbalance", "Overwhelmed", "Financial stress"] },
  { id: 66, name: "Three of Pentacles", upright: ["Teamwork", "Craftsmanship", "Learning"], reversed: ["Team discord", "Lack of skill", "Mediocrity"] },
  { id: 67, name: "Four of Pentacles", upright: ["Security", "Conservation", "Savings"], reversed: ["Miserliness", "Over-controlling", "Material obsession"] },
  { id: 68, name: "Five of Pentacles", upright: ["Hardship", "Isolation", "Financial difficulty"], reversed: ["Recovery", "Seeking help", "Turning point"] },
  { id: 69, name: "Six of Pentacles", upright: ["Generosity", "Giving & receiving", "Fairness"], reversed: ["Power imbalance", "Strings attached", "Debt"] },
  { id: 70, name: "Seven of Pentacles", upright: ["Patience", "Investment", "Long-term vision"], reversed: ["Impatience", "Poor returns", "Wasted effort"] },
  { id: 71, name: "Eight of Pentacles", upright: ["Mastery", "Focus", "Craftsmanship"], reversed: ["Perfectionism", "Lack of motivation", "Pointless repetition"] },
  { id: 72, name: "Nine of Pentacles", upright: ["Abundance", "Independence", "Self-worth"], reversed: ["Overspending", "Financial dependence", "Insecurity"] },
  { id: 73, name: "Ten of Pentacles", upright: ["Wealth", "Legacy", "Family"], reversed: ["Family disputes", "Inheritance issues", "Short-sightedness"] },
  { id: 74, name: "Page of Pentacles", upright: ["Study", "Opportunity", "Grounded"], reversed: ["Lack of progress", "Laziness", "Missed opportunity"] },
  { id: 75, name: "Knight of Pentacles", upright: ["Diligence", "Reliability", "Steadfast"], reversed: ["Stubborn", "Boredom", "Overly cautious"] },
  { id: 76, name: "Queen of Pentacles", upright: ["Practical", "Nurturing", "Abundant"], reversed: ["Self-neglect", "Over-worrying", "Material anxiety"] },
  { id: 77, name: "King of Pentacles", upright: ["Success", "Steady", "Financial mastery"], reversed: ["Greedy", "Workaholic", "Stubborn"] },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateCardImage(cardName: string, isReversed: boolean, keywords: string[]): Promise<Uint8Array | null> {
  const position = isReversed ? "Reversed" : "Upright";
  const prompt = `Create a mystical tarot card illustration for "${cardName}" (${position}). Style: ethereal watercolor with gold accents, dreamy cosmic atmosphere, rich symbolism. The card should evoke ${keywords.join(", ")}. Mystical, elegant, NO TEXT. Square format.`;
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")!}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    console.error("AI err", resp.status, (await resp.text()).slice(0, 200));
    return null;
  }
  const data = await resp.json();
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) return null;
  const b64 = url.split(",")[1];
  if (!b64) return null;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let authorized = !!token && token === SERVICE_KEY;
    if (!authorized && token) {
      const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: claimsData } = await authClient.auth.getClaims(token);
      const userId = claimsData?.claims?.sub as string | undefined;
      if (userId) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
        authorized = !!isAdmin;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const cardIds: number[] = Array.isArray(body.cardIds) && body.cardIds.length > 0
      ? body.cardIds : CARDS.map((c) => c.id);
    const orientations: ("up" | "rev")[] = Array.isArray(body.orientations) && body.orientations.length > 0
      ? body.orientations : ["up", "rev"];
    const force = !!body.force;

    const results: any[] = [];
    for (const id of cardIds) {
      const card = CARDS.find((c) => c.id === id);
      if (!card) { results.push({ id, status: "error", error: "unknown card id" }); continue; }
      for (const o of orientations) {
        const isReversed = o === "rev";
        const key = `${card.name} (${isReversed ? "rev" : "up"})`;
        try {
          if (!force) {
            const { data: existing } = await admin
              .from("tarot_card_art")
              .select("image_path")
              .eq("card_id", card.id)
              .eq("is_reversed", isReversed)
              .maybeSingle();
            if ((existing as any)?.image_path) {
              results.push({ card: key, status: "skipped" });
              continue;
            }
          }

          const keywords = isReversed ? card.reversed : card.upright;
          const bin = await generateCardImage(card.name, isReversed, keywords);
          if (!bin) { results.push({ card: key, status: "error", error: "no image" }); await sleep(1500); continue; }

          const objectPath = `shared/${card.id}_${isReversed ? "rev" : "up"}.png`;
          const { error: upErr } = await admin.storage
            .from(BUCKET)
            .upload(objectPath, bin, { contentType: "image/png", upsert: true });
          if (upErr) { results.push({ card: key, status: "error", error: upErr.message }); await sleep(1500); continue; }

          await admin.from("tarot_card_art").upsert(
            { card_id: card.id, is_reversed: isReversed, image_path: objectPath },
            { onConflict: "card_id,is_reversed" }
          );
          results.push({ card: key, status: "generated", path: objectPath });
        } catch (e: any) {
          results.push({ card: key, status: "error", error: e?.message || String(e) });
        }
        await sleep(1500);
      }
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
