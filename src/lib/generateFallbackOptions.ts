import type { BranchOption } from "@/lib/parseGameMarkers";

const agentOptionPools: Record<string, { keywords: string[]; options: BranchOption[] }[]> = {
  barista: [
    {
      keywords: ["stress", "overwhelm", "tired", "exhaust", "burn"],
      options: [
        { text: "I don't want to pretend I'm fine anymore", emotion: "brave" },
        { text: "Having someone just listen already helps", emotion: "gentle" },
        { text: "Where is all this exhaustion even coming from?", emotion: "rational" },
      ],
    },
    {
      keywords: ["breakup", "ex", "miss", "relationship", "love", "dating"],
      options: [
        { text: "Maybe letting go isn't forgetting — it's letting myself move on", emotion: "brave" },
        { text: "I'm not ready yet. Let me sit with this a little longer", emotion: "sad" },
        { text: "I need to figure out if I miss them or the idea of them", emotion: "rational" },
      ],
    },
    {
      keywords: ["brother", "sibling", "family", "advice"],
      options: [
        { text: "Sometimes just being there is more than enough", emotion: "gentle" },
        { text: "I know what it's like to wish you'd listened more", emotion: "brave" },
        { text: "Tell me about that empty chair in the corner", emotion: "curious" },
      ],
    },
  ],
  jax: [
    {
      keywords: ["anxiety", "panic", "worry", "scared", "fear"],
      options: [
        { text: "I want to understand what's underneath this anxiety", emotion: "curious" },
        { text: "Can we try that breathing exercise right now?", emotion: "gentle" },
        { text: "I'm ready to face this instead of running from it", emotion: "brave" },
      ],
    },
    {
      keywords: ["boundary", "boundaries", "toxic", "people-pleas", "say no"],
      options: [
        { text: "Setting boundaries feels selfish, but I know it's not", emotion: "brave" },
        { text: "Why is it so hard to put myself first?", emotion: "curious" },
        { text: "I need a game plan for the next time this happens", emotion: "rational" },
      ],
    },
    {
      keywords: ["work", "career", "burnout", "boss", "job"],
      options: [
        { text: "I think I've been confusing productivity with self-worth", emotion: "hopeful" },
        { text: "Where's the emergency exit in this situation?", emotion: "rational" },
        { text: "I'm scared that slowing down means falling behind", emotion: "brave" },
      ],
    },
    {
      keywords: ["fire", "burn", "smoke", "breathe", "suffocate"],
      options: [
        { text: "Help me find the oxygen in this situation", emotion: "brave" },
        { text: "I feel like I'm standing in the middle of my own fire", emotion: "sad" },
        { text: "What would you do if you were me, Jax?", emotion: "curious" },
      ],
    },
  ],
  mystic: [
    {
      keywords: ["confused", "lost", "stuck", "stuck in", "heavy"],
      options: [
        { text: "I feel stuck and I don't know what's underneath it", emotion: "sad" },
        { text: "What if I'm the one standing in my own way?", emotion: "brave" },
        { text: "I need to sit with this before I try to fix it", emotion: "gentle" },
      ],
    },
    {
      keywords: ["logic", "number", "data", "calculate", "probability"],
      options: [
        { text: "Some things can't be calculated, can they?", emotion: "gentle" },
        { text: "Tell me about when your numbers stopped making sense", emotion: "curious" },
        { text: "I need something beyond logic right now", emotion: "brave" },
      ],
    },
  ],
  bestie: [
    {
      keywords: ["ugly", "fat", "hate myself", "insecure", "not enough", "confident"],
      options: [
        { text: "Say it louder — I need someone to drown out the inner critic", emotion: "rebellious" },
        { text: "Logically I know I'm enough but my brain won't cooperate", emotion: "sad" },
        { text: "Let's channel this into main character energy instead", emotion: "hopeful" },
      ],
    },
    {
      keywords: ["interview", "date", "nervous", "presentation", "scared"],
      options: [
        { text: "Keep going, I need a full hype speech right now", emotion: "rebellious" },
        { text: "I want to walk in there like I own the place", emotion: "hopeful" },
        { text: "What if I mess up though?", emotion: "sad" },
      ],
    },
    {
      keywords: ["invisible", "ignored", "unseen", "nobody", "alone"],
      options: [
        { text: "I feel like I could disappear and nobody would notice", emotion: "sad" },
        { text: "How did you go from invisible to THIS?", emotion: "curious" },
        { text: "I'm tired of being the background character", emotion: "brave" },
      ],
    },
  ],
};

const genericOptions: BranchOption[][] = [
  [
    { text: "I think there's something I haven't said yet", emotion: "curious" },
    { text: "Maybe I need to look at this from a different angle", emotion: "rational" },
    { text: "I want to go deeper", emotion: "brave" },
  ],
  [
    { text: "That really resonated with me", emotion: "gentle" },
    { text: "Okay, so what's my next step?", emotion: "brave" },
    { text: "Let me sit with that for a moment…", emotion: "rational" },
  ],
  [
    { text: "I think I'm starting to understand myself better", emotion: "hopeful" },
    { text: "Thank you — I don't need to pretend here", emotion: "gentle" },
    { text: "I'm ready. Let's keep going", emotion: "brave" },
  ],
];

export function generateFallbackOptions(
  agentId: string,
  recentMessages: { role: string; content: string }[]
): BranchOption[] {
  const recentText = recentMessages
    .slice(-4)
    .map((m) => m.content.toLowerCase())
    .join(" ");

  const pools = agentOptionPools[agentId] || [];

  for (const pool of pools) {
    if (pool.keywords.some((kw) => recentText.includes(kw))) {
      return pool.options;
    }
  }

  const idx = Math.floor(Math.random() * genericOptions.length);
  return genericOptions[idx];
}
