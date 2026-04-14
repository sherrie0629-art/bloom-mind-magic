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
  ],
  coach: [
    {
      keywords: ["anxiety", "panic", "worry", "scared", "fear"],
      options: [
        { text: "I want to understand what's underneath this anxiety", emotion: "curious" },
        { text: "Can we try a grounding exercise right now?", emotion: "gentle" },
        { text: "I'm ready to face this instead of running from it", emotion: "brave" },
      ],
    },
    {
      keywords: ["boundary", "boundaries", "toxic", "people-pleas", "say no"],
      options: [
        { text: "Setting boundaries feels selfish, but I know it's not", emotion: "brave" },
        { text: "Why is it so hard to put myself first?", emotion: "curious" },
        { text: "I need a script for the next time this happens", emotion: "rational" },
      ],
    },
    {
      keywords: ["work", "career", "burnout", "boss", "job"],
      options: [
        { text: "I think I've been confusing productivity with self-worth", emotion: "hopeful" },
        { text: "What would it look like to set a boundary at work?", emotion: "rational" },
        { text: "I'm scared that slowing down means falling behind", emotion: "brave" },
      ],
    },
  ],
  mystic: [
    {
      keywords: ["universe", "sign", "fate", "meant to be", "destiny"],
      options: [
        { text: "I want to trust the universe but I'm scared it's not listening", emotion: "brave" },
        { text: "Pull a card for me — I need to see what's coming", emotion: "curious" },
        { text: "Maybe this is divine timing and I just can't see the pattern yet", emotion: "hopeful" },
      ],
    },
    {
      keywords: ["confused", "lost", "stuck", "energy", "blocked"],
      options: [
        { text: "I feel like my energy is blocked and I don't know how to clear it", emotion: "sad" },
        { text: "What if I'm the one standing in my own way?", emotion: "brave" },
        { text: "I need to sit with this darkness before I can find the light", emotion: "gentle" },
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
