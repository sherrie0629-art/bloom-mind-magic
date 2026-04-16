export interface ConstellationMeta {
  name: string;
  relatedSources: string[];
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  agentId?: string;
  constellation: ConstellationMeta;
  condition: {
    type: "total_turns" | "energy_bits" | "bond_level" | "easter_eggs" | "truth_shards" | "total_conversations";
    agentId?: string;
    threshold: number;
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "coffee_regular",
    name: "Coffee Regular",
    description: "Complete 10 conversations with Chloe",
    icon: "☕",
    agentId: "barista",
    constellation: { name: "The Barista", relatedSources: ["chat"] },
    condition: { type: "total_turns", agentId: "barista", threshold: 10 },
  },
  {
    id: "latte_soulmate",
    name: "Latte Soulmate",
    description: "Reach Close bond with Chloe",
    icon: "🫶",
    agentId: "barista",
    constellation: { name: "The Pour-Over", relatedSources: ["chat"] },
    condition: { type: "bond_level", agentId: "barista", threshold: 4 },
  },
  {
    id: "fireproof",
    name: "Fireproof",
    description: "Collect 100 energy with Jax",
    icon: "🔥",
    agentId: "jax",
    constellation: { name: "The Firewall", relatedSources: ["chat", "emotion"] },
    condition: { type: "energy_bits", agentId: "jax", threshold: 100 },
  },
  {
    id: "breakthrough",
    name: "Breakthrough",
    description: "Complete 20 conversations with Jax",
    icon: "💪",
    agentId: "jax",
    constellation: { name: "The Breakthrough", relatedSources: ["chat"] },
    condition: { type: "total_turns", agentId: "jax", threshold: 20 },
  },
  {
    id: "trail_companion",
    name: "Trail Companion",
    description: "Complete 15 conversations with Arthur",
    icon: "🌲",
    agentId: "mentor",
    constellation: { name: "The Trail", relatedSources: ["chat", "enneagram"] },
    condition: { type: "total_turns", agentId: "mentor", threshold: 15 },
  },
  {
    id: "campfire_bond",
    name: "Campfire Bond",
    description: "Reach Trusted bond with Arthur",
    icon: "🔥",
    agentId: "mentor",
    constellation: { name: "The Campfire", relatedSources: ["chat"] },
    condition: { type: "bond_level", agentId: "mentor", threshold: 3 },
  },
  {
    id: "hype_squad",
    name: "Hype Squad",
    description: "Complete 10 conversations with Zoe",
    icon: "💅",
    agentId: "bestie",
    constellation: { name: "The Crown", relatedSources: ["chat"] },
    condition: { type: "total_turns", agentId: "bestie", threshold: 10 },
  },
  {
    id: "main_character",
    name: "Main Character",
    description: "Reach Close bond with Zoe",
    icon: "👑",
    agentId: "bestie",
    constellation: { name: "The Spotlight", relatedSources: ["chat"] },
    condition: { type: "bond_level", agentId: "bestie", threshold: 4 },
  },
  {
    id: "first_step",
    name: "First Conversation",
    description: "Complete your first meaningful conversation",
    icon: "🌱",
    constellation: { name: "The Beginning", relatedSources: ["chat"] },
    condition: { type: "total_conversations", threshold: 1 },
  },
  {
    id: "soul_explorer",
    name: "Soul Explorer",
    description: "Have a conversation with every character",
    icon: "🔮",
    constellation: { name: "The Explorer", relatedSources: ["mbti", "enneagram", "zodiac", "emotion"] },
    condition: { type: "total_conversations", threshold: 4 },
  },
  {
    id: "energy_collector",
    name: "Energy Collector",
    description: "Collect 300 total energy",
    icon: "⚡",
    constellation: { name: "The Energy", relatedSources: ["chat"] },
    condition: { type: "energy_bits", threshold: 300 },
  },
  {
    id: "shard_hunter",
    name: "Shard Hunter",
    description: "Collect 5 truth shards",
    icon: "💎",
    constellation: { name: "The Hunter", relatedSources: ["chat", "mbti"] },
    condition: { type: "truth_shards", threshold: 5 },
  },
  {
    id: "egg_finder",
    name: "Easter Egg Finder",
    description: "Trigger 2 hidden easter eggs",
    icon: "🥚",
    constellation: { name: "The Seeker", relatedSources: ["chat"] },
    condition: { type: "easter_eggs", threshold: 2 },
  },
];
