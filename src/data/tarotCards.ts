export interface TarotCard {
  id: number;
  name: string;
  nameCn: string;
  emoji: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  arcana: "major" | "minor";
  suit?: string;
}

export const tarotCards: TarotCard[] = [
  // ===== Major Arcana =====
  { id: 0, name: "The Fool", nameCn: "愚者", emoji: "🃏", arcana: "major", uprightKeywords: ["New beginnings", "Freedom", "Adventure"], reversedKeywords: ["Recklessness", "Hesitation", "Fear"] },
  { id: 1, name: "The Magician", nameCn: "魔术师", emoji: "🎩", arcana: "major", uprightKeywords: ["Creativity", "Willpower", "Focus"], reversedKeywords: ["Deception", "Lack of skill", "Lost"] },
  { id: 2, name: "The High Priestess", nameCn: "女祭司", emoji: "🌙", arcana: "major", uprightKeywords: ["Intuition", "Wisdom", "Inner voice"], reversedKeywords: ["Ignored intuition", "Secrecy", "Superficiality"] },
  { id: 3, name: "The Empress", nameCn: "女皇", emoji: "👑", arcana: "major", uprightKeywords: ["Abundance", "Nurturing", "Sensuality"], reversedKeywords: ["Codependency", "Creative block", "Self-neglect"] },
  { id: 4, name: "The Emperor", nameCn: "皇帝", emoji: "🏛️", arcana: "major", uprightKeywords: ["Authority", "Structure", "Stability"], reversedKeywords: ["Controlling", "Rigid", "Lack of discipline"] },
  { id: 5, name: "The Hierophant", nameCn: "教皇", emoji: "📿", arcana: "major", uprightKeywords: ["Tradition", "Faith", "Guidance"], reversedKeywords: ["Rebellion", "Dogma", "Blind conformity"] },
  { id: 6, name: "The Lovers", nameCn: "恋人", emoji: "💕", arcana: "major", uprightKeywords: ["Love", "Harmony", "Choices"], reversedKeywords: ["Discord", "Imbalance", "Value conflict"] },
  { id: 7, name: "The Chariot", nameCn: "战车", emoji: "⚡", arcana: "major", uprightKeywords: ["Victory", "Determination", "Drive"], reversedKeywords: ["Loss of control", "Directionless", "Aggression"] },
  { id: 8, name: "Strength", nameCn: "力量", emoji: "🦁", arcana: "major", uprightKeywords: ["Inner strength", "Courage", "Gentleness"], reversedKeywords: ["Self-doubt", "Vulnerability", "Suppressed emotions"] },
  { id: 9, name: "The Hermit", nameCn: "隐者", emoji: "🏔️", arcana: "major", uprightKeywords: ["Introspection", "Solitude", "Seeking truth"], reversedKeywords: ["Isolation", "Avoidance", "Withdrawal"] },
  { id: 10, name: "Wheel of Fortune", nameCn: "命运之轮", emoji: "🎡", arcana: "major", uprightKeywords: ["Change", "Opportunity", "Destiny"], reversedKeywords: ["Resisting change", "Bad luck", "Loss of control"] },
  { id: 11, name: "Justice", nameCn: "正义", emoji: "⚖️", arcana: "major", uprightKeywords: ["Fairness", "Karma", "Truth"], reversedKeywords: ["Injustice", "Avoiding responsibility", "Bias"] },
  { id: 12, name: "The Hanged Man", nameCn: "倒吊人", emoji: "🔄", arcana: "major", uprightKeywords: ["Surrender", "New perspective", "Patience"], reversedKeywords: ["Procrastination", "Pointless sacrifice", "Stubbornness"] },
  { id: 13, name: "Death", nameCn: "死神", emoji: "🦋", arcana: "major", uprightKeywords: ["Transformation", "Endings & rebirth", "Letting go"], reversedKeywords: ["Resisting change", "Stagnation", "Fear"] },
  { id: 14, name: "Temperance", nameCn: "节制", emoji: "🌈", arcana: "major", uprightKeywords: ["Balance", "Patience", "Moderation"], reversedKeywords: ["Extremes", "Imbalance", "Impatience"] },
  { id: 15, name: "The Devil", nameCn: "恶魔", emoji: "🔗", arcana: "major", uprightKeywords: ["Bondage", "Desire", "Shadow self"], reversedKeywords: ["Liberation", "Awakening", "Breaking free"] },
  { id: 16, name: "The Tower", nameCn: "高塔", emoji: "⚡", arcana: "major", uprightKeywords: ["Upheaval", "Revelation", "Breaking down"], reversedKeywords: ["Avoiding disaster", "Fear of change", "Delayed collapse"] },
  { id: 17, name: "The Star", nameCn: "星星", emoji: "⭐", arcana: "major", uprightKeywords: ["Hope", "Inspiration", "Serenity"], reversedKeywords: ["Disappointment", "Lack of faith", "Disconnected"] },
  { id: 18, name: "The Moon", nameCn: "月亮", emoji: "🌕", arcana: "major", uprightKeywords: ["Illusion", "Subconscious", "Intuition"], reversedKeywords: ["Clarity", "Facing fears", "Release of anxiety"] },
  { id: 19, name: "The Sun", nameCn: "太阳", emoji: "☀️", arcana: "major", uprightKeywords: ["Joy", "Success", "Vitality"], reversedKeywords: ["Temporary sadness", "Over-optimism", "Delayed gratification"] },
  { id: 20, name: "Judgement", nameCn: "审判", emoji: "📯", arcana: "major", uprightKeywords: ["Awakening", "Rebirth", "Inner calling"], reversedKeywords: ["Self-criticism", "Refusing growth", "Indecision"] },
  { id: 21, name: "The World", nameCn: "世界", emoji: "🌍", arcana: "major", uprightKeywords: ["Completion", "Achievement", "Fulfillment"], reversedKeywords: ["Incomplete", "Lack of closure", "Stagnation"] },

  // ===== Minor Arcana - Wands =====
  { id: 22, name: "Ace of Wands", nameCn: "权杖王牌", emoji: "🔥", arcana: "minor", suit: "wands", uprightKeywords: ["Inspiration", "Innovation", "Passion"], reversedKeywords: ["Delays", "Lack of direction", "Creative block"] },
  { id: 23, name: "Two of Wands", nameCn: "权杖二", emoji: "🔥", arcana: "minor", suit: "wands", uprightKeywords: ["Planning", "Decisions", "Vision"], reversedKeywords: ["Fear of unknown", "Poor planning", "Hesitation"] },
  { id: 24, name: "Three of Wands", nameCn: "权杖三", emoji: "🔥", arcana: "minor", suit: "wands", uprightKeywords: ["Expansion", "Foresight", "Progress"], reversedKeywords: ["Setbacks", "Delays", "Narrow vision"] },
  { id: 25, name: "Four of Wands", nameCn: "权杖四", emoji: "🎉", arcana: "minor", suit: "wands", uprightKeywords: ["Celebration", "Harmony", "Belonging"], reversedKeywords: ["Instability", "Conflict", "Lack of belonging"] },
  { id: 26, name: "Five of Wands", nameCn: "权杖五", emoji: "⚔️", arcana: "minor", suit: "wands", uprightKeywords: ["Competition", "Conflict", "Challenge"], reversedKeywords: ["Avoiding conflict", "Inner tension", "Resolution"] },
  { id: 27, name: "Six of Wands", nameCn: "权杖六", emoji: "🏆", arcana: "minor", suit: "wands", uprightKeywords: ["Victory", "Recognition", "Confidence"], reversedKeywords: ["Fear of failure", "Lack of recognition", "Self-doubt"] },
  { id: 28, name: "Seven of Wands", nameCn: "权杖七", emoji: "🛡️", arcana: "minor", suit: "wands", uprightKeywords: ["Perseverance", "Defense", "Courage"], reversedKeywords: ["Giving in", "Exhaustion", "Surrender"] },
  { id: 29, name: "Eight of Wands", nameCn: "权杖八", emoji: "💨", arcana: "minor", suit: "wands", uprightKeywords: ["Swift action", "Progress", "Messages"], reversedKeywords: ["Delays", "Obstacles", "Rushing"] },
  { id: 30, name: "Nine of Wands", nameCn: "权杖九", emoji: "💪", arcana: "minor", suit: "wands", uprightKeywords: ["Resilience", "Persistence", "Last stand"], reversedKeywords: ["Burnout", "Paranoia", "Giving up"] },
  { id: 31, name: "Ten of Wands", nameCn: "权杖十", emoji: "😩", arcana: "minor", suit: "wands", uprightKeywords: ["Burden", "Responsibility", "Overload"], reversedKeywords: ["Release", "Delegation", "Collapse"] },
  { id: 32, name: "Page of Wands", nameCn: "权杖侍从", emoji: "🌱", arcana: "minor", suit: "wands", uprightKeywords: ["Exploration", "Enthusiasm", "Curiosity"], reversedKeywords: ["Directionless", "Impulsive", "Fleeting interest"] },
  { id: 33, name: "Knight of Wands", nameCn: "权杖骑士", emoji: "🐎", arcana: "minor", suit: "wands", uprightKeywords: ["Adventure", "Energy", "Action"], reversedKeywords: ["Reckless", "Arrogant", "Scattered energy"] },
  { id: 34, name: "Queen of Wands", nameCn: "权杖王后", emoji: "🌻", arcana: "minor", suit: "wands", uprightKeywords: ["Confidence", "Charisma", "Independence"], reversedKeywords: ["Jealousy", "Selfishness", "Insecurity"] },
  { id: 35, name: "King of Wands", nameCn: "权杖国王", emoji: "🔱", arcana: "minor", suit: "wands", uprightKeywords: ["Leadership", "Vision", "Boldness"], reversedKeywords: ["Domineering", "Impulsive", "Unrealistic expectations"] },

  // ===== Minor Arcana - Cups =====
  { id: 36, name: "Ace of Cups", nameCn: "圣杯王牌", emoji: "💧", arcana: "minor", suit: "cups", uprightKeywords: ["New love", "Intuition", "Emotional flow"], reversedKeywords: ["Emotional block", "Emptiness", "Repressed feelings"] },
  { id: 37, name: "Two of Cups", nameCn: "圣杯二", emoji: "💑", arcana: "minor", suit: "cups", uprightKeywords: ["Partnership", "Connection", "Understanding"], reversedKeywords: ["Imbalance", "Separation", "Misunderstanding"] },
  { id: 38, name: "Three of Cups", nameCn: "圣杯三", emoji: "🥂", arcana: "minor", suit: "cups", uprightKeywords: ["Friendship", "Community", "Celebration"], reversedKeywords: ["Isolation", "Overindulgence", "Gossip"] },
  { id: 39, name: "Four of Cups", nameCn: "圣杯四", emoji: "😑", arcana: "minor", suit: "cups", uprightKeywords: ["Contemplation", "Reevaluation", "Apathy"], reversedKeywords: ["Awakening", "New opportunity", "Stepping out"] },
  { id: 40, name: "Five of Cups", nameCn: "圣杯五", emoji: "😢", arcana: "minor", suit: "cups", uprightKeywords: ["Loss", "Grief", "Regret"], reversedKeywords: ["Acceptance", "Moving on", "Finding hope"] },
  { id: 41, name: "Six of Cups", nameCn: "圣杯六", emoji: "🧸", arcana: "minor", suit: "cups", uprightKeywords: ["Nostalgia", "Innocence", "Warm memories"], reversedKeywords: ["Stuck in past", "Immaturity", "Clinging"] },
  { id: 42, name: "Seven of Cups", nameCn: "圣杯七", emoji: "💭", arcana: "minor", suit: "cups", uprightKeywords: ["Fantasy", "Choices", "Imagination"], reversedKeywords: ["Disillusion", "Temptation", "Need for clarity"] },
  { id: 43, name: "Eight of Cups", nameCn: "圣杯八", emoji: "🚶", arcana: "minor", suit: "cups", uprightKeywords: ["Walking away", "Seeking depth", "Letting go"], reversedKeywords: ["Avoidance", "Fear of leaving", "Aimless"] },
  { id: 44, name: "Nine of Cups", nameCn: "圣杯九", emoji: "😊", arcana: "minor", suit: "cups", uprightKeywords: ["Contentment", "Wish fulfilled", "Gratitude"], reversedKeywords: ["Greed", "Dissatisfaction", "Materialism"] },
  { id: 45, name: "Ten of Cups", nameCn: "圣杯十", emoji: "🌈", arcana: "minor", suit: "cups", uprightKeywords: ["Happiness", "Family harmony", "Fulfillment"], reversedKeywords: ["Family conflict", "Broken dreams", "Disharmony"] },
  { id: 46, name: "Page of Cups", nameCn: "圣杯侍从", emoji: "🐟", arcana: "minor", suit: "cups", uprightKeywords: ["Creative spark", "Intuition", "Emotional message"], reversedKeywords: ["Emotional immaturity", "Escapism", "Creative block"] },
  { id: 47, name: "Knight of Cups", nameCn: "圣杯骑士", emoji: "🦄", arcana: "minor", suit: "cups", uprightKeywords: ["Romance", "Charm", "Following the heart"], reversedKeywords: ["Unrealistic", "Jealousy", "Moodiness"] },
  { id: 48, name: "Queen of Cups", nameCn: "圣杯王后", emoji: "🧜", arcana: "minor", suit: "cups", uprightKeywords: ["Empathy", "Compassion", "Deep intuition"], reversedKeywords: ["Codependency", "Martyrdom", "Poor boundaries"] },
  { id: 49, name: "King of Cups", nameCn: "圣杯国王", emoji: "🌊", arcana: "minor", suit: "cups", uprightKeywords: ["Emotional maturity", "Calm", "Wisdom"], reversedKeywords: ["Emotional repression", "Manipulation", "Coldness"] },

  // ===== Minor Arcana - Swords =====
  { id: 50, name: "Ace of Swords", nameCn: "宝剑王牌", emoji: "🗡️", arcana: "minor", suit: "swords", uprightKeywords: ["Clarity", "Truth", "Breakthrough"], reversedKeywords: ["Confusion", "Miscommunication", "Lack of clarity"] },
  { id: 51, name: "Two of Swords", nameCn: "宝剑二", emoji: "⚖️", arcana: "minor", suit: "swords", uprightKeywords: ["Dilemma", "Stalemate", "Inner conflict"], reversedKeywords: ["Information overload", "Anxiety", "Delayed decision"] },
  { id: 52, name: "Three of Swords", nameCn: "宝剑三", emoji: "💔", arcana: "minor", suit: "swords", uprightKeywords: ["Heartbreak", "Sorrow", "Loss"], reversedKeywords: ["Healing", "Releasing pain", "Forgiveness"] },
  { id: 53, name: "Four of Swords", nameCn: "宝剑四", emoji: "😴", arcana: "minor", suit: "swords", uprightKeywords: ["Rest", "Recovery", "Meditation"], reversedKeywords: ["Restlessness", "Overwork", "Forced action"] },
  { id: 54, name: "Five of Swords", nameCn: "宝剑五", emoji: "😤", arcana: "minor", suit: "swords", uprightKeywords: ["Conflict", "Defeat", "Selfishness"], reversedKeywords: ["Reconciliation", "Letting go", "Lesson learned"] },
  { id: 55, name: "Six of Swords", nameCn: "宝剑六", emoji: "🚢", arcana: "minor", suit: "swords", uprightKeywords: ["Transition", "Moving on", "Calm waters"], reversedKeywords: ["Resisting change", "Unfinished business", "Old wounds"] },
  { id: 56, name: "Seven of Swords", nameCn: "宝剑七", emoji: "🦊", arcana: "minor", suit: "swords", uprightKeywords: ["Strategy", "Going solo", "Resourcefulness"], reversedKeywords: ["Exposed deceit", "Avoiding consequences", "Self-deception"] },
  { id: 57, name: "Eight of Swords", nameCn: "宝剑八", emoji: "🙈", arcana: "minor", suit: "swords", uprightKeywords: ["Trapped", "Self-limiting", "Powerlessness"], reversedKeywords: ["Freedom", "New perspective", "Empowerment"] },
  { id: 58, name: "Nine of Swords", nameCn: "宝剑九", emoji: "😰", arcana: "minor", suit: "swords", uprightKeywords: ["Anxiety", "Nightmares", "Worry"], reversedKeywords: ["Relief", "Facing fears", "Recovery"] },
  { id: 59, name: "Ten of Swords", nameCn: "宝剑十", emoji: "🌅", arcana: "minor", suit: "swords", uprightKeywords: ["Rock bottom", "Ending", "New dawn"], reversedKeywords: ["Recovery", "Resisting endings", "Lingering"] },
  { id: 60, name: "Page of Swords", nameCn: "宝剑侍从", emoji: "🔍", arcana: "minor", suit: "swords", uprightKeywords: ["Curiosity", "Thinking", "Truth-seeking"], reversedKeywords: ["Cynicism", "Gossip", "Overthinking"] },
  { id: 61, name: "Knight of Swords", nameCn: "宝剑骑士", emoji: "⚡", arcana: "minor", suit: "swords", uprightKeywords: ["Decisive", "Swift", "Ambitious"], reversedKeywords: ["Reckless", "Hurtful words", "Impulsive action"] },
  { id: 62, name: "Queen of Swords", nameCn: "宝剑王后", emoji: "❄️", arcana: "minor", suit: "swords", uprightKeywords: ["Perceptive", "Independent", "Direct"], reversedKeywords: ["Cold", "Biased", "Emotionally closed"] },
  { id: 63, name: "King of Swords", nameCn: "宝剑国王", emoji: "🧠", arcana: "minor", suit: "swords", uprightKeywords: ["Rational", "Authority", "Integrity"], reversedKeywords: ["Tyrannical", "Ruthless", "Abuse of power"] },

  // ===== Minor Arcana - Pentacles =====
  { id: 64, name: "Ace of Pentacles", nameCn: "星币王牌", emoji: "💎", arcana: "minor", suit: "pentacles", uprightKeywords: ["New opportunity", "Prosperity", "Grounded"], reversedKeywords: ["Missed chance", "Poor planning", "Greed"] },
  { id: 65, name: "Two of Pentacles", nameCn: "星币二", emoji: "🎪", arcana: "minor", suit: "pentacles", uprightKeywords: ["Balance", "Flexibility", "Multitasking"], reversedKeywords: ["Imbalance", "Overwhelmed", "Financial stress"] },
  { id: 66, name: "Three of Pentacles", nameCn: "星币三", emoji: "🏗️", arcana: "minor", suit: "pentacles", uprightKeywords: ["Teamwork", "Craftsmanship", "Learning"], reversedKeywords: ["Team discord", "Lack of skill", "Mediocrity"] },
  { id: 67, name: "Four of Pentacles", nameCn: "星币四", emoji: "🏦", arcana: "minor", suit: "pentacles", uprightKeywords: ["Security", "Conservation", "Savings"], reversedKeywords: ["Miserliness", "Over-controlling", "Material obsession"] },
  { id: 68, name: "Five of Pentacles", nameCn: "星币五", emoji: "🥶", arcana: "minor", suit: "pentacles", uprightKeywords: ["Hardship", "Isolation", "Financial difficulty"], reversedKeywords: ["Recovery", "Seeking help", "Turning point"] },
  { id: 69, name: "Six of Pentacles", nameCn: "星币六", emoji: "🤝", arcana: "minor", suit: "pentacles", uprightKeywords: ["Generosity", "Giving & receiving", "Fairness"], reversedKeywords: ["Power imbalance", "Strings attached", "Debt"] },
  { id: 70, name: "Seven of Pentacles", nameCn: "星币七", emoji: "🌿", arcana: "minor", suit: "pentacles", uprightKeywords: ["Patience", "Investment", "Long-term vision"], reversedKeywords: ["Impatience", "Poor returns", "Wasted effort"] },
  { id: 71, name: "Eight of Pentacles", nameCn: "星币八", emoji: "🔨", arcana: "minor", suit: "pentacles", uprightKeywords: ["Mastery", "Focus", "Craftsmanship"], reversedKeywords: ["Perfectionism", "Lack of motivation", "Pointless repetition"] },
  { id: 72, name: "Nine of Pentacles", nameCn: "星币九", emoji: "🍇", arcana: "minor", suit: "pentacles", uprightKeywords: ["Abundance", "Independence", "Self-worth"], reversedKeywords: ["Overspending", "Financial dependence", "Insecurity"] },
  { id: 73, name: "Ten of Pentacles", nameCn: "星币十", emoji: "🏡", arcana: "minor", suit: "pentacles", uprightKeywords: ["Wealth", "Legacy", "Family"], reversedKeywords: ["Family disputes", "Inheritance issues", "Short-sightedness"] },
  { id: 74, name: "Page of Pentacles", nameCn: "星币侍从", emoji: "📚", arcana: "minor", suit: "pentacles", uprightKeywords: ["Study", "Opportunity", "Grounded"], reversedKeywords: ["Lack of progress", "Laziness", "Missed opportunity"] },
  { id: 75, name: "Knight of Pentacles", nameCn: "星币骑士", emoji: "🐂", arcana: "minor", suit: "pentacles", uprightKeywords: ["Diligence", "Reliability", "Steadfast"], reversedKeywords: ["Stubborn", "Boredom", "Overly cautious"] },
  { id: 76, name: "Queen of Pentacles", nameCn: "星币王后", emoji: "🌺", arcana: "minor", suit: "pentacles", uprightKeywords: ["Practical", "Nurturing", "Abundant"], reversedKeywords: ["Self-neglect", "Over-worrying", "Material anxiety"] },
  { id: 77, name: "King of Pentacles", nameCn: "星币国王", emoji: "👔", arcana: "minor", suit: "pentacles", uprightKeywords: ["Success", "Steady", "Financial mastery"], reversedKeywords: ["Greedy", "Workaholic", "Stubborn"] },
];

export function drawRandomCard(): { card: TarotCard; isReversed: boolean } {
  const card = tarotCards[Math.floor(Math.random() * tarotCards.length)];
  const isReversed = Math.random() < 0.35;
  return { card, isReversed };
}
