export interface ConstellationMeta {
  name: string;
  relatedSources: string[]; // maps to soul_fragments source_type
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
    id: "dream_guardian",
    name: "梦境守卫",
    description: "与云生完成10次有效对话",
    icon: "🌙",
    agentId: "dream",
    constellation: { name: "梦境守卫座", relatedSources: ["chat"] },
    condition: { type: "total_turns", agentId: "dream", threshold: 10 },
  },
  {
    id: "dream_master",
    name: "织梦大师",
    description: "与云生达到知己羁绊",
    icon: "🦋",
    agentId: "dream",
    constellation: { name: "织梦座", relatedSources: ["chat"] },
    condition: { type: "bond_level", agentId: "dream", threshold: 4 },
  },
  {
    id: "star_traveler",
    name: "星际旅伴",
    description: "星轨能量收集满100",
    icon: "🚀",
    agentId: "astro",
    constellation: { name: "星际旅伴座", relatedSources: ["chat", "zodiac"] },
    condition: { type: "energy_bits", agentId: "astro", threshold: 100 },
  },
  {
    id: "star_navigator",
    name: "星际领航员",
    description: "与星轨完成20次对话",
    icon: "⭐",
    agentId: "astro",
    constellation: { name: "领航座", relatedSources: ["chat"] },
    condition: { type: "total_turns", agentId: "astro", threshold: 20 },
  },
  {
    id: "heart_mender",
    name: "缝心匠人",
    description: "与暖暖完成15次有效对话",
    icon: "💕",
    agentId: "healer",
    constellation: { name: "缝心座", relatedSources: ["chat", "emotion"] },
    condition: { type: "total_turns", agentId: "healer", threshold: 15 },
  },
  {
    id: "warm_soul",
    name: "暖心守护者",
    description: "与暖暖达到信任羁绊",
    icon: "🌸",
    agentId: "healer",
    constellation: { name: "暖心座", relatedSources: ["chat"] },
    condition: { type: "bond_level", agentId: "healer", threshold: 3 },
  },
  {
    id: "logic_master",
    name: "逻辑大师",
    description: "与老王完成10次有效对话",
    icon: "🧠",
    agentId: "tree",
    constellation: { name: "逻辑座", relatedSources: ["chat"] },
    condition: { type: "total_turns", agentId: "tree", threshold: 10 },
  },
  {
    id: "clear_mind",
    name: "清醒达人",
    description: "与老王达到知己羁绊",
    icon: "💅",
    agentId: "tree",
    constellation: { name: "清醒座", relatedSources: ["chat"] },
    condition: { type: "bond_level", agentId: "tree", threshold: 4 },
  },
  {
    id: "first_step",
    name: "初次倾诉",
    description: "完成第一次有效对话",
    icon: "🌱",
    constellation: { name: "启程座", relatedSources: ["chat"] },
    condition: { type: "total_conversations", threshold: 1 },
  },
  {
    id: "soul_explorer",
    name: "灵魂探索者",
    description: "与所有角色都进行过对话",
    icon: "🔮",
    constellation: { name: "探索座", relatedSources: ["mbti", "bazi", "zodiac", "emotion"] },
    condition: { type: "total_conversations", threshold: 4 },
  },
  {
    id: "energy_collector",
    name: "能量收集者",
    description: "累计收集300能量",
    icon: "⚡",
    constellation: { name: "能量座", relatedSources: ["chat"] },
    condition: { type: "energy_bits", threshold: 300 },
  },
  {
    id: "shard_hunter",
    name: "碎片猎人",
    description: "收集5个真相碎片",
    icon: "💎",
    constellation: { name: "猎人座", relatedSources: ["chat", "mbti"] },
    condition: { type: "truth_shards", threshold: 5 },
  },
  {
    id: "egg_finder",
    name: "彩蛋发现者",
    description: "触发任意2个隐藏彩蛋",
    icon: "🥚",
    constellation: { name: "彩蛋座", relatedSources: ["chat"] },
    condition: { type: "easter_eggs", threshold: 2 },
  },
];
