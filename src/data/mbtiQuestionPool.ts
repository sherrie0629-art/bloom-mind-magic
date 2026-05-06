// Hand-curated MBTI scenario question sets used as instant fallbacks
// so users see Q1 immediately while a fresh AI batch is prefetched in the background.
// Each set must contain exactly 10 questions covering E/I, S/N, T/F, J/P (2-3 each).

export interface PoolOption { label: string; text: string; }
export interface PoolQuestion { question: string; options: PoolOption[]; dimension: string; }
export type PoolSet = PoolQuestion[];

const ZH_SET_1: PoolSet = [
  { question: "🌙 凌晨两点，三年没联系的朋友突然发来一句"在吗"。", dimension: "E/I", options: [
    { label: "A", text: "立刻回："在，怎么了？"" },
    { label: "B", text: "截图甩进闺蜜群："这什么意思"" },
    { label: "C", text: "划走，假装明天才看到" },
    { label: "D", text: "回个"嗯"，等对方先开口" },
  ]},
  { question: "☕ 你走进一家从没去过的咖啡馆，菜单全是没听过的名字。", dimension: "S/N", options: [
    { label: "A", text: "问店员今天最推荐哪一款" },
    { label: "B", text: "凭名字最玄学的那个直接点" },
    { label: "C", text: "扫一眼别人桌上喝什么再说" },
    { label: "D", text: "保险起见，要一杯美式" },
  ]},
  { question: "🛸 一艘飞船降落在你家楼下，外星人请你介绍人类。", dimension: "S/N", options: [
    { label: "A", text: "认真讲讲我们怎么发明了火和 wifi" },
    { label: "B", text: "递给它一副耳机，放周杰伦" },
    { label: "C", text: "演示一下"挤地铁"是什么" },
    { label: "D", text: "反过来问它："你们那边有爱吗"" },
  ]},
  { question: "🪞 早上照镜子，镜子里的你眨了一下你没眨的那只眼。", dimension: "T/F", options: [
    { label: "A", text: "冷静研究：是不是没睡醒产生的错觉" },
    { label: "B", text: "对它笑了笑："你也不容易"" },
    { label: "C", text: "退后一步，掏出手机录像存证" },
    { label: "D", text: "假装无事发生，刷牙去了" },
  ]},
  { question: "🎭 你被空降到陌生人的婚礼，新人是你完全不认识的人。", dimension: "E/I", options: [
    { label: "A", text: "随便找一桌坐下，开始干饭聊天" },
    { label: "B", text: "悄悄溜到角落看大家热闹" },
    { label: "C", text: "直接去找新人合影、留祝福" },
    { label: "D", text: "评估完逃生路线，找借口先撤" },
  ]},
  { question: "📮 收到一张匿名明信片，背面只写了一句"该回家了"。", dimension: "T/F", options: [
    { label: "A", text: "心里咯噔一下，开始想是谁寄的" },
    { label: "B", text: "拍照发朋友圈："来人破案"" },
    { label: "C", text: "翻邮戳、对笔迹，认真排查" },
    { label: "D", text: "把它压在台灯下，当成神秘装饰" },
  ]},
  { question: "🚪 推开一扇门，里面是 10 岁的自己在写作业。", dimension: "F/T", options: [
    { label: "A", text: "蹲下来抱抱 ta："辛苦啦"" },
    { label: "B", text: "提醒 ta："这道题以后用不上"" },
    { label: "C", text: "陪 ta 写完，再一起吃个零食" },
    { label: "D", text: "悄悄退出去，怕打扰 ta" },
  ]},
  { question: "🎲 朋友邀你周末出去玩，但没说去哪、几点、怎么去。", dimension: "J/P", options: [
    { label: "A", text: "马上追问详细行程，方便规划" },
    { label: "B", text: "答应再说，到时候随机应变" },
    { label: "C", text: "提议由我来安排路线和时间" },
    { label: "D", text: "看心情，到当天再决定要不要去" },
  ]},
  { question: "🌧 暴雨困在便利店，旁边一个陌生人开始小声哭。", dimension: "F/T", options: [
    { label: "A", text: "递过去一包纸巾，不说话" },
    { label: "B", text: "假装没看见，给 ta 留点空间" },
    { label: "C", text: "轻声问一句："要紧吗"" },
    { label: "D", text: "默默买杯热饮放在 ta 身边" },
  ]},
  { question: "🪐 你被告知只能再活 24 小时，但没人会知道你死了。", dimension: "J/P", options: [
    { label: "A", text: "列张清单，把想做的事都做掉" },
    { label: "B", text: "去做一件这辈子最想做却没做的事" },
    { label: "C", text: "回家陪家人吃顿饭，谁也不告诉" },
    { label: "D", text: "睡到自然醒，剩下的随便走走" },
  ]},
];

const ZH_SET_2: PoolSet = [
  { question: "🌙 你独自值夜班，监控里突然多出一个穿你衣服的身影。", dimension: "T/F", options: [
    { label: "A", text: "冷静记下时间，回放截图" },
    { label: "B", text: "心里一紧，赶紧打电话给朋友" },
    { label: "C", text: "起身去现场看到底是什么" },
    { label: "D", text: "关掉监控，眼不见为净" },
  ]},
  { question: "☕ 公司新来的同事第一天就请你喝奶茶。", dimension: "E/I", options: [
    { label: "A", text: "顺势聊起来，认识一下" },
    { label: "B", text: "礼貌道谢，回工位继续干活" },
    { label: "C", text: "问 ta 为啥请我，是有事？" },
    { label: "D", text: "下午回请一杯，扯平" },
  ]},
  { question: "🛸 你穿越到 2099 年，AI 替所有人做了一切决定。", dimension: "J/P", options: [
    { label: "A", text: "松了口气，终于不用选午饭了" },
    { label: "B", text: "想办法找到能自己决定的小空间" },
    { label: "C", text: "研究 AI 是怎么决定的，找规律" },
    { label: "D", text: "组队反抗，把选择权抢回来" },
  ]},
  { question: "🪞 镜子里有人对你比了个"嘘"。", dimension: "S/N", options: [
    { label: "A", text: "我也比一个，看 ta 怎么反应" },
    { label: "B", text: "立刻揉眼睛，怀疑自己累过头" },
    { label: "C", text: "脑补出整段平行宇宙剧本" },
    { label: "D", text: "拍下来明天发群里" },
  ]},
  { question: "🎭 你被邀请去一场只能戴面具的派对。", dimension: "E/I", options: [
    { label: "A", text: "戴上就放飞，反正没人认识" },
    { label: "B", text: "找个安静角落，观察大家" },
    { label: "C", text: "主动去搭讪几个有趣的面具" },
    { label: "D", text: "中途偷偷把面具摘了" },
  ]},
  { question: "📮 楼下出现一个写着"许愿"的木箱，没人知道是谁放的。", dimension: "S/N", options: [
    { label: "A", text: "认真写一个最近的烦恼塞进去" },
    { label: "B", text: "好奇是谁放的，蹲点看看" },
    { label: "C", text: "塞张白纸进去，看会发生啥" },
    { label: "D", text: "经过看一眼，没必要参与" },
  ]},
  { question: "🚪 同事偷偷告诉你：他在用公司流量挂副业。", dimension: "T/F", options: [
    { label: "A", text: "嘴上不说，心里默默记下了" },
    { label: "B", text: "劝 ta 收手，公司迟早会发现" },
    { label: "C", text: "假装没听见，跟我无关" },
    { label: "D", text: "好奇追问："效益咋样"" },
  ]},
  { question: "🎲 你被随机分到一个 6 人小组做项目，组员全是陌生人。", dimension: "J/P", options: [
    { label: "A", text: "立刻拉群、定 deadline、分工" },
    { label: "B", text: "先观察谁靠谱，再决定怎么干" },
    { label: "C", text: "等组长出现，听安排就行" },
    { label: "D", text: "把自己的部分先做完，别的随缘" },
  ]},
  { question: "🌧 朋友哭着打电话来说分手了，但你下午还有重要会议。", dimension: "F/T", options: [
    { label: "A", text: "先安抚 ta，会议迟到也无所谓" },
    { label: "B", text: "约 ta 晚上详聊，先稳住情绪" },
    { label: "C", text: "边听边赶去会议，能帮多少帮多少" },
    { label: "D", text: "理性分析这段感情值不值得难过" },
  ]},
  { question: "🪐 你被赋予一种新感官，但只有你能感受到。", dimension: "F/T", options: [
    { label: "A", text: "天天写日记记录这种感觉" },
    { label: "B", text: "想方设法让别人也体验一次" },
    { label: "C", text: "研究它是怎么运作的、有没有规律" },
    { label: "D", text: "藏起来当秘密，谁也不告诉" },
  ]},
];

const EN_SET_1: PoolSet = [
  { question: "🌙 2 a.m. — a friend you haven't heard from in 3 years texts \"u up?\".", dimension: "E/I", options: [
    { label: "A", text: "Reply right away: \"yeah, what's up?\"" },
    { label: "B", text: "Screenshot it to your group chat first" },
    { label: "C", text: "Ignore it, deal with it tomorrow" },
    { label: "D", text: "Send a single \"hm?\" and wait" },
  ]},
  { question: "☕ You walk into a café where every drink name is unfamiliar.", dimension: "S/N", options: [
    { label: "A", text: "Ask the barista what's their favorite" },
    { label: "B", text: "Pick the weirdest-sounding name on the menu" },
    { label: "C", text: "Glance at other tables for clues" },
    { label: "D", text: "Order a safe black coffee" },
  ]},
  { question: "🛸 An alien lands and asks you to explain humans in 60 seconds.", dimension: "S/N", options: [
    { label: "A", text: "Walk through fire, language, the internet" },
    { label: "B", text: "Hand over headphones playing your favorite song" },
    { label: "C", text: "Mime a packed subway commute" },
    { label: "D", text: "Ask back: \"do you have love?\"" },
  ]},
  { question: "🪞 In the mirror, your reflection blinks an eye you didn't.", dimension: "T/F", options: [
    { label: "A", text: "Calmly think: probably just sleep deprivation" },
    { label: "B", text: "Smile at it: \"rough day too, huh?\"" },
    { label: "C", text: "Step back, start filming as evidence" },
    { label: "D", text: "Pretend nothing happened, brush teeth" },
  ]},
  { question: "🎭 You're dropped into a stranger's wedding mid-toast.", dimension: "E/I", options: [
    { label: "A", text: "Sit at any table and start chatting" },
    { label: "B", text: "Hide in a corner and people-watch" },
    { label: "C", text: "Walk up and congratulate the couple" },
    { label: "D", text: "Find the exit, slip out gracefully" },
  ]},
  { question: "📮 An anonymous postcard arrives saying \"time to come home\".", dimension: "T/F", options: [
    { label: "A", text: "Heart skips — start guessing who sent it" },
    { label: "B", text: "Post it online: \"help me solve this\"" },
    { label: "C", text: "Inspect the postmark and handwriting carefully" },
    { label: "D", text: "Tuck it under the lamp as decor" },
  ]},
  { question: "🚪 You open a door and find your 10-year-old self doing homework.", dimension: "F/T", options: [
    { label: "A", text: "Crouch down and give them a hug" },
    { label: "B", text: "Whisper \"you'll never use this math\"" },
    { label: "C", text: "Sit beside them and finish it together" },
    { label: "D", text: "Quietly back out, don't disturb" },
  ]},
  { question: "🎲 A friend invites you out — no time, place, or plan given.", dimension: "J/P", options: [
    { label: "A", text: "Ask for the full itinerary right away" },
    { label: "B", text: "Say yes and figure it out later" },
    { label: "C", text: "Offer to plan and book everything yourself" },
    { label: "D", text: "Decide on the day based on mood" },
  ]},
  { question: "🌧 Stuck in a 7-Eleven during a storm, the stranger beside you starts crying.", dimension: "F/T", options: [
    { label: "A", text: "Hand them a tissue without saying a word" },
    { label: "B", text: "Pretend not to notice, give them space" },
    { label: "C", text: "Softly ask \"are you okay?\"" },
    { label: "D", text: "Quietly buy them a warm drink" },
  ]},
  { question: "🪐 You have 24 hours left, and no one will ever know you died.", dimension: "J/P", options: [
    { label: "A", text: "Make a list and tick everything off" },
    { label: "B", text: "Do the one thing you've always avoided" },
    { label: "C", text: "Have dinner with family, say nothing" },
    { label: "D", text: "Sleep in, then wander wherever" },
  ]},
];

const EN_SET_2: PoolSet = [
  { question: "🌙 Working a night shift, the camera shows a second you walking by.", dimension: "T/F", options: [
    { label: "A", text: "Note the timestamp and save the clip" },
    { label: "B", text: "Heart races — call a friend immediately" },
    { label: "C", text: "Get up and check in person" },
    { label: "D", text: "Switch the monitor off, problem solved" },
  ]},
  { question: "☕ A new coworker buys you bubble tea on day one.", dimension: "E/I", options: [
    { label: "A", text: "Sit and chat, nice way to meet" },
    { label: "B", text: "Thank them politely, head back to work" },
    { label: "C", text: "Ask why — what do they want?" },
    { label: "D", text: "Buy them one back later, even score" },
  ]},
  { question: "🛸 You wake up in 2099. AI now decides everything for everyone.", dimension: "J/P", options: [
    { label: "A", text: "Relief — no more choosing what to eat" },
    { label: "B", text: "Find the small spaces still up to you" },
    { label: "C", text: "Study how the AI decides, find patterns" },
    { label: "D", text: "Join the resistance, take choice back" },
  ]},
  { question: "🪞 Your reflection puts a finger to its lips: shhh.", dimension: "S/N", options: [
    { label: "A", text: "Mirror it back, see what happens" },
    { label: "B", text: "Rub your eyes, you must be tired" },
    { label: "C", text: "Imagine an entire parallel-world plot" },
    { label: "D", text: "Take a photo, post it tomorrow" },
  ]},
  { question: "🎭 You're invited to a party where everyone wears masks.", dimension: "E/I", options: [
    { label: "A", text: "Mask on, full chaos mode, no one knows you" },
    { label: "B", text: "Find a quiet corner and observe" },
    { label: "C", text: "Approach the most interesting masks" },
    { label: "D", text: "Take your mask off halfway through" },
  ]},
  { question: "📮 A wooden \"wishing box\" appears downstairs with no owner.", dimension: "S/N", options: [
    { label: "A", text: "Write a real worry and slip it in" },
    { label: "B", text: "Stake out who's behind it" },
    { label: "C", text: "Drop in a blank paper, see what happens" },
    { label: "D", text: "Walk past, not your business" },
  ]},
  { question: "🚪 A coworker confesses they're running a side hustle on company wifi.", dimension: "T/F", options: [
    { label: "A", text: "Say nothing but quietly remember" },
    { label: "B", text: "Warn them — it'll get noticed eventually" },
    { label: "C", text: "Pretend you didn't hear, not your problem" },
    { label: "D", text: "Curiously ask: \"is it making money?\"" },
  ]},
  { question: "🎲 You're randomly grouped with 5 strangers for a project.", dimension: "J/P", options: [
    { label: "A", text: "Make a chat, set deadlines, divide work" },
    { label: "B", text: "Watch who's reliable before committing" },
    { label: "C", text: "Wait for someone else to lead" },
    { label: "D", text: "Finish your own part, let others sort theirs" },
  ]},
  { question: "🌧 A friend calls crying about a breakup — you have a key meeting in 20 min.", dimension: "F/T", options: [
    { label: "A", text: "Stay on the call, meeting can wait" },
    { label: "B", text: "Promise tonight, calm them down first" },
    { label: "C", text: "Listen while walking to the meeting" },
    { label: "D", text: "Rationally weigh if the relationship was worth it" },
  ]},
  { question: "🪐 You get a new sense — only you can feel it.", dimension: "F/T", options: [
    { label: "A", text: "Journal every sensation in detail" },
    { label: "B", text: "Try to make others feel it too" },
    { label: "C", text: "Study how it works, find the rules" },
    { label: "D", text: "Keep it secret, tell no one" },
  ]},
];

export const mbtiQuestionPool = {
  zh: [ZH_SET_1, ZH_SET_2],
  en: [EN_SET_1, EN_SET_2],
};

export function pickQuestionSet(locale: string): PoolSet {
  const sets = locale.startsWith("zh") ? mbtiQuestionPool.zh : mbtiQuestionPool.en;
  const lastIdStr = typeof window !== "undefined" ? window.localStorage.getItem("mbti-last-set-idx") : null;
  const lastIdx = lastIdStr ? parseInt(lastIdStr, 10) : -1;
  let idx = Math.floor(Math.random() * sets.length);
  if (sets.length > 1 && idx === lastIdx) idx = (idx + 1) % sets.length;
  if (typeof window !== "undefined") window.localStorage.setItem("mbti-last-set-idx", String(idx));
  return sets[idx];
}
