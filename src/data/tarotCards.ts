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
  // ===== 大阿卡纳 (Major Arcana) =====
  { id: 0, name: "The Fool", nameCn: "愚者", emoji: "🃏", arcana: "major", uprightKeywords: ["新开始", "自由", "冒险"], reversedKeywords: ["鲁莽", "犹豫", "恐惧"] },
  { id: 1, name: "The Magician", nameCn: "魔术师", emoji: "🎩", arcana: "major", uprightKeywords: ["创造力", "意志力", "专注"], reversedKeywords: ["欺骗", "技能不足", "迷失"] },
  { id: 2, name: "The High Priestess", nameCn: "女祭司", emoji: "🌙", arcana: "major", uprightKeywords: ["直觉", "智慧", "内在声音"], reversedKeywords: ["忽视直觉", "隐秘", "表面化"] },
  { id: 3, name: "The Empress", nameCn: "女皇", emoji: "👑", arcana: "major", uprightKeywords: ["丰盛", "滋养", "感官愉悦"], reversedKeywords: ["过度依赖", "创造力阻塞", "忽视自我"] },
  { id: 4, name: "The Emperor", nameCn: "皇帝", emoji: "🏛️", arcana: "major", uprightKeywords: ["权威", "结构", "稳定"], reversedKeywords: ["控制欲", "僵化", "缺乏纪律"] },
  { id: 5, name: "The Hierophant", nameCn: "教皇", emoji: "📿", arcana: "major", uprightKeywords: ["传统", "信仰", "指引"], reversedKeywords: ["叛逆", "教条", "盲从"] },
  { id: 6, name: "The Lovers", nameCn: "恋人", emoji: "💕", arcana: "major", uprightKeywords: ["爱情", "和谐", "选择"], reversedKeywords: ["不和", "失衡", "价值冲突"] },
  { id: 7, name: "The Chariot", nameCn: "战车", emoji: "⚡", arcana: "major", uprightKeywords: ["胜利", "决心", "行动力"], reversedKeywords: ["失控", "方向迷失", "攻击性"] },
  { id: 8, name: "Strength", nameCn: "力量", emoji: "🦁", arcana: "major", uprightKeywords: ["内在力量", "勇气", "温柔"], reversedKeywords: ["自我怀疑", "脆弱", "压抑情绪"] },
  { id: 9, name: "The Hermit", nameCn: "隐者", emoji: "🏔️", arcana: "major", uprightKeywords: ["内省", "独处", "寻找答案"], reversedKeywords: ["孤立", "逃避", "过度封闭"] },
  { id: 10, name: "Wheel of Fortune", nameCn: "命运之轮", emoji: "🎡", arcana: "major", uprightKeywords: ["转变", "机遇", "命运"], reversedKeywords: ["抗拒变化", "厄运", "失控感"] },
  { id: 11, name: "Justice", nameCn: "正义", emoji: "⚖️", arcana: "major", uprightKeywords: ["公正", "因果", "真相"], reversedKeywords: ["不公", "逃避责任", "偏见"] },
  { id: 12, name: "The Hanged Man", nameCn: "倒吊人", emoji: "🔄", arcana: "major", uprightKeywords: ["放下", "新视角", "等待"], reversedKeywords: ["拖延", "无意义牺牲", "固执"] },
  { id: 13, name: "Death", nameCn: "死神", emoji: "🦋", arcana: "major", uprightKeywords: ["转变", "结束与新生", "放手"], reversedKeywords: ["抗拒改变", "停滞", "恐惧"] },
  { id: 14, name: "Temperance", nameCn: "节制", emoji: "🌈", arcana: "major", uprightKeywords: ["平衡", "耐心", "调和"], reversedKeywords: ["极端", "失衡", "急躁"] },
  { id: 15, name: "The Devil", nameCn: "恶魔", emoji: "🔗", arcana: "major", uprightKeywords: ["束缚", "欲望", "阴影面"], reversedKeywords: ["释放", "觉醒", "打破枷锁"] },
  { id: 16, name: "The Tower", nameCn: "高塔", emoji: "⚡", arcana: "major", uprightKeywords: ["突变", "觉醒", "破旧立新"], reversedKeywords: ["逃避灾难", "恐惧改变", "延迟崩塌"] },
  { id: 17, name: "The Star", nameCn: "星星", emoji: "⭐", arcana: "major", uprightKeywords: ["希望", "灵感", "宁静"], reversedKeywords: ["失望", "缺乏信念", "脱离现实"] },
  { id: 18, name: "The Moon", nameCn: "月亮", emoji: "🌕", arcana: "major", uprightKeywords: ["幻象", "潜意识", "直觉"], reversedKeywords: ["困惑消散", "面对恐惧", "清明"] },
  { id: 19, name: "The Sun", nameCn: "太阳", emoji: "☀️", arcana: "major", uprightKeywords: ["快乐", "成功", "活力"], reversedKeywords: ["暂时低落", "过度乐观", "延迟满足"] },
  { id: 20, name: "Judgement", nameCn: "审判", emoji: "📯", arcana: "major", uprightKeywords: ["觉醒", "重生", "内在呼唤"], reversedKeywords: ["自我批判", "拒绝成长", "犹豫不决"] },
  { id: 21, name: "The World", nameCn: "世界", emoji: "🌍", arcana: "major", uprightKeywords: ["完满", "成就", "圆满"], reversedKeywords: ["未完成", "缺乏闭合", "停滞"] },

  // ===== 小阿卡纳 - 权杖 (Wands) =====
  { id: 22, name: "Ace of Wands", nameCn: "权杖王牌", emoji: "🔥", arcana: "minor", suit: "wands", uprightKeywords: ["灵感", "创新", "激情"], reversedKeywords: ["延迟", "缺乏方向", "创意枯竭"] },
  { id: 23, name: "Two of Wands", nameCn: "权杖二", emoji: "🔥", arcana: "minor", suit: "wands", uprightKeywords: ["计划", "决策", "远见"], reversedKeywords: ["恐惧未知", "缺乏计划", "犹豫"] },
  { id: 24, name: "Three of Wands", nameCn: "权杖三", emoji: "🔥", arcana: "minor", suit: "wands", uprightKeywords: ["拓展", "前瞻", "进展"], reversedKeywords: ["挫折", "延迟", "眼界狭窄"] },
  { id: 25, name: "Four of Wands", nameCn: "权杖四", emoji: "🎉", arcana: "minor", suit: "wands", uprightKeywords: ["庆祝", "和谐", "归属感"], reversedKeywords: ["不稳定", "冲突", "缺乏归属"] },
  { id: 26, name: "Five of Wands", nameCn: "权杖五", emoji: "⚔️", arcana: "minor", suit: "wands", uprightKeywords: ["竞争", "冲突", "挑战"], reversedKeywords: ["回避冲突", "内在冲突", "和解"] },
  { id: 27, name: "Six of Wands", nameCn: "权杖六", emoji: "🏆", arcana: "minor", suit: "wands", uprightKeywords: ["胜利", "认可", "自信"], reversedKeywords: ["失败恐惧", "缺乏认可", "自我怀疑"] },
  { id: 28, name: "Seven of Wands", nameCn: "权杖七", emoji: "🛡️", arcana: "minor", suit: "wands", uprightKeywords: ["坚持", "捍卫", "勇气"], reversedKeywords: ["退让", "疲惫", "放弃"] },
  { id: 29, name: "Eight of Wands", nameCn: "权杖八", emoji: "💨", arcana: "minor", suit: "wands", uprightKeywords: ["快速行动", "进展", "消息"], reversedKeywords: ["延迟", "受阻", "急躁"] },
  { id: 30, name: "Nine of Wands", nameCn: "权杖九", emoji: "💪", arcana: "minor", suit: "wands", uprightKeywords: ["坚韧", "毅力", "最后防线"], reversedKeywords: ["精疲力竭", "偏执", "放弃抵抗"] },
  { id: 31, name: "Ten of Wands", nameCn: "权杖十", emoji: "😩", arcana: "minor", suit: "wands", uprightKeywords: ["负担", "责任", "过度承载"], reversedKeywords: ["释放负担", "委托他人", "崩溃"] },
  { id: 32, name: "Page of Wands", nameCn: "权杖侍从", emoji: "🌱", arcana: "minor", suit: "wands", uprightKeywords: ["探索", "热情", "好奇心"], reversedKeywords: ["缺乏方向", "冲动", "三分钟热度"] },
  { id: 33, name: "Knight of Wands", nameCn: "权杖骑士", emoji: "🐎", arcana: "minor", suit: "wands", uprightKeywords: ["冒险", "热血", "行动力"], reversedKeywords: ["鲁莽", "傲慢", "能量分散"] },
  { id: 34, name: "Queen of Wands", nameCn: "权杖王后", emoji: "🌻", arcana: "minor", suit: "wands", uprightKeywords: ["自信", "魅力", "独立"], reversedKeywords: ["嫉妒", "自私", "不安全感"] },
  { id: 35, name: "King of Wands", nameCn: "权杖国王", emoji: "🔱", arcana: "minor", suit: "wands", uprightKeywords: ["领导力", "愿景", "大胆"], reversedKeywords: ["专横", "冲动", "期望过高"] },

  // ===== 小阿卡纳 - 圣杯 (Cups) =====
  { id: 36, name: "Ace of Cups", nameCn: "圣杯王牌", emoji: "💧", arcana: "minor", suit: "cups", uprightKeywords: ["新感情", "直觉", "爱的流动"], reversedKeywords: ["情感阻塞", "空虚", "压抑感情"] },
  { id: 37, name: "Two of Cups", nameCn: "圣杯二", emoji: "💑", arcana: "minor", suit: "cups", uprightKeywords: ["伙伴", "联结", "相互理解"], reversedKeywords: ["不平衡", "分离", "误解"] },
  { id: 38, name: "Three of Cups", nameCn: "圣杯三", emoji: "🥂", arcana: "minor", suit: "cups", uprightKeywords: ["友谊", "社交", "庆祝"], reversedKeywords: ["孤立", "过度放纵", "八卦"] },
  { id: 39, name: "Four of Cups", nameCn: "圣杯四", emoji: "😑", arcana: "minor", suit: "cups", uprightKeywords: ["冥想", "重新评估", "倦怠"], reversedKeywords: ["觉醒", "新机遇", "走出舒适区"] },
  { id: 40, name: "Five of Cups", nameCn: "圣杯五", emoji: "😢", arcana: "minor", suit: "cups", uprightKeywords: ["失落", "悲伤", "遗憾"], reversedKeywords: ["接受", "前行", "找到希望"] },
  { id: 41, name: "Six of Cups", nameCn: "圣杯六", emoji: "🧸", arcana: "minor", suit: "cups", uprightKeywords: ["怀旧", "童真", "温暖回忆"], reversedKeywords: ["沉溺过去", "不成熟", "放不下"] },
  { id: 42, name: "Seven of Cups", nameCn: "圣杯七", emoji: "💭", arcana: "minor", suit: "cups", uprightKeywords: ["幻想", "选择", "想象力"], reversedKeywords: ["幻灭", "诱惑", "需要决断"] },
  { id: 43, name: "Eight of Cups", nameCn: "圣杯八", emoji: "🚶", arcana: "minor", suit: "cups", uprightKeywords: ["离开", "寻找更深意义", "放手"], reversedKeywords: ["逃避", "害怕离开", "漫无目的"] },
  { id: 44, name: "Nine of Cups", nameCn: "圣杯九", emoji: "😊", arcana: "minor", suit: "cups", uprightKeywords: ["满足", "愿望成真", "感恩"], reversedKeywords: ["贪婪", "不满足", "物质主义"] },
  { id: 45, name: "Ten of Cups", nameCn: "圣杯十", emoji: "🌈", arcana: "minor", suit: "cups", uprightKeywords: ["幸福", "家庭和谐", "圆满"], reversedKeywords: ["家庭冲突", "期望落空", "不和谐"] },
  { id: 46, name: "Page of Cups", nameCn: "圣杯侍从", emoji: "🐟", arcana: "minor", suit: "cups", uprightKeywords: ["创意", "直觉", "情感信息"], reversedKeywords: ["情感不成熟", "逃避现实", "创意阻塞"] },
  { id: 47, name: "Knight of Cups", nameCn: "圣杯骑士", emoji: "🦄", arcana: "minor", suit: "cups", uprightKeywords: ["浪漫", "魅力", "追随心灵"], reversedKeywords: ["不切实际", "嫉妒", "情绪化"] },
  { id: 48, name: "Queen of Cups", nameCn: "圣杯王后", emoji: "🧜", arcana: "minor", suit: "cups", uprightKeywords: ["共情", "关怀", "直觉力"], reversedKeywords: ["情感依赖", "殉道者", "缺乏边界"] },
  { id: 49, name: "King of Cups", nameCn: "圣杯国王", emoji: "🌊", arcana: "minor", suit: "cups", uprightKeywords: ["情感成熟", "冷静", "智慧"], reversedKeywords: ["情感压抑", "操控", "冷漠"] },

  // ===== 小阿卡纳 - 宝剑 (Swords) =====
  { id: 50, name: "Ace of Swords", nameCn: "宝剑王牌", emoji: "🗡️", arcana: "minor", suit: "swords", uprightKeywords: ["清晰", "真相", "突破"], reversedKeywords: ["混乱", "误解", "缺乏清晰"] },
  { id: 51, name: "Two of Swords", nameCn: "宝剑二", emoji: "⚖️", arcana: "minor", suit: "swords", uprightKeywords: ["抉择", "僵局", "内心冲突"], reversedKeywords: ["信息过载", "焦虑", "延迟决策"] },
  { id: 52, name: "Three of Swords", nameCn: "宝剑三", emoji: "💔", arcana: "minor", suit: "swords", uprightKeywords: ["心痛", "悲伤", "失去"], reversedKeywords: ["愈合", "释放痛苦", "宽恕"] },
  { id: 53, name: "Four of Swords", nameCn: "宝剑四", emoji: "😴", arcana: "minor", suit: "swords", uprightKeywords: ["休息", "恢复", "静心"], reversedKeywords: ["烦躁", "过度劳累", "被迫行动"] },
  { id: 54, name: "Five of Swords", nameCn: "宝剑五", emoji: "😤", arcana: "minor", suit: "swords", uprightKeywords: ["冲突", "失败", "自私"], reversedKeywords: ["和解", "放下争执", "学到教训"] },
  { id: 55, name: "Six of Swords", nameCn: "宝剑六", emoji: "🚢", arcana: "minor", suit: "swords", uprightKeywords: ["过渡", "离开困境", "平静"], reversedKeywords: ["抗拒转变", "未解之事", "旧伤"] },
  { id: 56, name: "Seven of Swords", nameCn: "宝剑七", emoji: "🦊", arcana: "minor", suit: "swords", uprightKeywords: ["策略", "独自行动", "机智"], reversedKeywords: ["欺骗暴露", "逃避后果", "自欺"] },
  { id: 57, name: "Eight of Swords", nameCn: "宝剑八", emoji: "🙈", arcana: "minor", suit: "swords", uprightKeywords: ["困境", "自我限制", "无力感"], reversedKeywords: ["解脱", "新视角", "赋能"] },
  { id: 58, name: "Nine of Swords", nameCn: "宝剑九", emoji: "😰", arcana: "minor", suit: "swords", uprightKeywords: ["焦虑", "噩梦", "忧虑"], reversedKeywords: ["释然", "面对恐惧", "康复中"] },
  { id: 59, name: "Ten of Swords", nameCn: "宝剑十", emoji: "🌅", arcana: "minor", suit: "swords", uprightKeywords: ["触底", "结束", "新黎明"], reversedKeywords: ["恢复", "抗拒结束", "苟延残喘"] },
  { id: 60, name: "Page of Swords", nameCn: "宝剑侍从", emoji: "🔍", arcana: "minor", suit: "swords", uprightKeywords: ["好奇", "思考", "真相追寻"], reversedKeywords: ["冷嘲", "八卦", "思虑过度"] },
  { id: 61, name: "Knight of Swords", nameCn: "宝剑骑士", emoji: "⚡", arcana: "minor", suit: "swords", uprightKeywords: ["果断", "迅速", "野心"], reversedKeywords: ["鲁莽", "言语伤人", "冲动行事"] },
  { id: 62, name: "Queen of Swords", nameCn: "宝剑王后", emoji: "❄️", arcana: "minor", suit: "swords", uprightKeywords: ["洞察力", "独立", "直言不讳"], reversedKeywords: ["冷酷", "偏见", "情感封闭"] },
  { id: 63, name: "King of Swords", nameCn: "宝剑国王", emoji: "🧠", arcana: "minor", suit: "swords", uprightKeywords: ["理性", "权威", "正直"], reversedKeywords: ["独裁", "冷酷无情", "滥用权力"] },

  // ===== 小阿卡纳 - 星币 (Pentacles) =====
  { id: 64, name: "Ace of Pentacles", nameCn: "星币王牌", emoji: "💎", arcana: "minor", suit: "pentacles", uprightKeywords: ["新机遇", "繁荣", "踏实"], reversedKeywords: ["错失机会", "计划不周", "贪婪"] },
  { id: 65, name: "Two of Pentacles", nameCn: "星币二", emoji: "🎪", arcana: "minor", suit: "pentacles", uprightKeywords: ["平衡", "灵活", "多任务"], reversedKeywords: ["失衡", "过度忙碌", "财务压力"] },
  { id: 66, name: "Three of Pentacles", nameCn: "星币三", emoji: "🏗️", arcana: "minor", suit: "pentacles", uprightKeywords: ["合作", "技艺", "学习"], reversedKeywords: ["团队不和", "缺乏技能", "敷衍"] },
  { id: 67, name: "Four of Pentacles", nameCn: "星币四", emoji: "🏦", arcana: "minor", suit: "pentacles", uprightKeywords: ["安全感", "保守", "积蓄"], reversedKeywords: ["吝啬", "过度控制", "物质执念"] },
  { id: 68, name: "Five of Pentacles", nameCn: "星币五", emoji: "🥶", arcana: "minor", suit: "pentacles", uprightKeywords: ["困难", "孤立", "财务困境"], reversedKeywords: ["恢复", "寻求帮助", "困境转机"] },
  { id: 69, name: "Six of Pentacles", nameCn: "星币六", emoji: "🤝", arcana: "minor", suit: "pentacles", uprightKeywords: ["慷慨", "施予受", "公平"], reversedKeywords: ["权力不平等", "附条件的给予", "债务"] },
  { id: 70, name: "Seven of Pentacles", nameCn: "星币七", emoji: "🌿", arcana: "minor", suit: "pentacles", uprightKeywords: ["耐心", "投资", "长远眼光"], reversedKeywords: ["急于求成", "回报不佳", "浪费资源"] },
  { id: 71, name: "Eight of Pentacles", nameCn: "星币八", emoji: "🔨", arcana: "minor", suit: "pentacles", uprightKeywords: ["精进", "专注", "匠人精神"], reversedKeywords: ["完美主义", "缺乏动力", "重复无意义"] },
  { id: 72, name: "Nine of Pentacles", nameCn: "星币九", emoji: "🍇", arcana: "minor", suit: "pentacles", uprightKeywords: ["丰收", "独立", "自我实现"], reversedKeywords: ["过度消费", "财务依赖", "安全威胁"] },
  { id: 73, name: "Ten of Pentacles", nameCn: "星币十", emoji: "🏡", arcana: "minor", suit: "pentacles", uprightKeywords: ["财富", "传承", "家族"], reversedKeywords: ["家庭纷争", "财产争议", "短视"] },
  { id: 74, name: "Page of Pentacles", nameCn: "星币侍从", emoji: "📚", arcana: "minor", suit: "pentacles", uprightKeywords: ["学习", "机遇", "脚踏实地"], reversedKeywords: ["缺乏进展", "懒惰", "错失良机"] },
  { id: 75, name: "Knight of Pentacles", nameCn: "星币骑士", emoji: "🐂", arcana: "minor", suit: "pentacles", uprightKeywords: ["勤奋", "可靠", "坚持"], reversedKeywords: ["固执", "无聊", "过度保守"] },
  { id: 76, name: "Queen of Pentacles", nameCn: "星币王后", emoji: "🌺", arcana: "minor", suit: "pentacles", uprightKeywords: ["务实", "温暖", "富足"], reversedKeywords: ["忽视自我", "过度操心", "物质焦虑"] },
  { id: 77, name: "King of Pentacles", nameCn: "星币国王", emoji: "👔", arcana: "minor", suit: "pentacles", uprightKeywords: ["成功", "稳健", "财务掌控"], reversedKeywords: ["贪婪", "工作狂", "固执己见"] },
];

export function drawRandomCard(): { card: TarotCard; isReversed: boolean } {
  const card = tarotCards[Math.floor(Math.random() * tarotCards.length)];
  const isReversed = Math.random() < 0.35; // 35% chance reversed
  return { card, isReversed };
}
