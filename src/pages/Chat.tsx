import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mic, Zap, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import { useQuoteCard } from "@/hooks/useQuoteCard";
import ShareSheet from "@/components/ShareSheet";
import ReactMarkdown from "react-markdown";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import BondIndicator from "@/components/BondIndicator";
import BondLevelUp from "@/components/BondLevelUp";
import EnergyFloat from "@/components/EnergyFloat";
import TruthShardPopup from "@/components/TruthShardPopup";
import AchievementUnlock from "@/components/AchievementUnlock";
import EasterEggEffect from "@/components/EasterEggEffect";
import BranchSelector from "@/components/BranchSelector";
import ChatParticles from "@/components/ChatParticles";
import AgentProfileDrawer from "@/components/AgentProfileDrawer";
import { useAchievements } from "@/hooks/useAchievements";
import { agents as RAW_AGENTS, BOND_LABELS } from "@/data/agents";
import { localizeAgent, getAgentWelcome, getAgentQuickReplies } from "@/lib/localizeAgent";
import { useAuth } from "@/contexts/AuthContext";
const ANON_MSG_LIMIT = 5;
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type Msg } from "@/lib/streamChat";
import SEO from "@/components/SEO";
import { useBond } from "@/hooks/useBond";
import { useSubscription } from "@/hooks/useSubscription";
import { parseGameMarkers, type BranchOption, type Atmosphere } from "@/lib/parseGameMarkers";
import { generateFallbackOptions } from "@/lib/generateFallbackOptions";
import { toast } from "sonner";
import { generateSoulFragment } from "@/hooks/useSoulFragment";
import TarotCardInline, { type InlineTarotCard } from "@/components/TarotCardInline";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  branchOptions?: BranchOption[] | null;
  kind?: "text" | "tarot-card";
  tarotCard?: InlineTarotCard | null; // null = loading skeleton
}

// Intent detection: does the user want to draw a tarot card?
const isTarotDrawIntent = (text: string): boolean => {
  const t = text.toLowerCase().trim();
  // Chinese: 抽一张牌 / 帮我抽张牌 / 抽张塔罗 / 来一张塔罗 / 给我抽 / 抽牌
  if (/(抽|来|给我).{0,8}(张|一张|牌|塔罗)/.test(text) && /(牌|塔罗)/.test(text)) return true;
  if (/抽牌|抽塔罗|塔罗牌/.test(text)) return true;
  // English: draw/pull a card, give me a tarot
  if (/\b(draw|pull|give me|pick).{0,15}(card|tarot)\b/.test(t)) return true;
  if (/\btarot\s+(reading|card)\b/.test(t)) return true;
  return false;
};

const EASTER_EGG_MARKER = "【🔮 Hidden Memory Unlocked】";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user, session, promptLogin } = useAuth();
  const agentId = searchParams.get("agent") || "barista";
  const rawAgent = RAW_AGENTS.find((a) => a.id === agentId) || RAW_AGENTS[0];
  const agent = localizeAgent(rawAgent, t);
  const mbtiResult = (location.state as any)?.mbtiResult as { mbtiType: string; title: string; description: string; parallelUniverse?: any } | undefined;
  const emotionResult = (location.state as any)?.emotionResult as { emotionLevel: string; title: string; description: string; traits: { burnout: number; energy: number; boundaries: number; sleep: number }; suggestions: string[] } | undefined;
  const enneagramResult = (location.state as any)?.enneagramResult as { type: number; wing?: string; title: string; description: string; coreFear: string; coreDesire: string; growthPath: string; stressArrow: string; advice: string } | undefined;
  const zodiacResult = (location.state as any)?.zodiacResult as { zodiacSign: string; element: string; title: string; description: string; traits: any; luckyItems?: any; advice: any } | undefined;
  const tarotResult = (location.state as any)?.tarotResult as { cardName: string; isReversed: boolean; energyScore: number; interpretation: string; actionTip: string } | undefined;
  const compatibilityResult = (location.state as any)?.compatibilityResult as { partnerName: string; partnerMbti?: string; partnerZodiac?: string; overallScore: number; title: string; summary: string; dimensions: any; strengths: string[]; conflicts: string[]; loveLanguage: { mine: string; partner: string; tip: string }; deepAnalysis?: string } | undefined;
  const mbtiAutoSentRef = useRef(false);
  const emotionAutoSentRef = useRef(false);
  const enneagramAutoSentRef = useRef(false);
  const zodiacAutoSentRef = useRef(false);
  const tarotAutoSentRef = useRef(false);
  const compatibilityAutoSentRef = useRef(false);

  const getWelcomeMessage = (a: typeof agent) => getAgentWelcome(a, t);

  const quickReplies: Record<string, string[]> = {
    [agentId]: getAgentQuickReplies(agent, t),
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [memoryContext, setMemoryContext] = useState<string[]>([]);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [energyBits, setEnergyBits] = useState(0);
  const [showEnergyFloat, setShowEnergyFloat] = useState(false);
  const [lastEnergyGain, setLastEnergyGain] = useState<number | null>(null);
  const [pendingShard, setPendingShard] = useState<{ title: string; description: string } | null>(null);
  const [showShard, setShowShard] = useState(false);
  const [atmosphere, setAtmosphere] = useState<Atmosphere>(null);
  const [dynamicBg, setDynamicBg] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { generateQuoteCard } = useQuoteCard();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { bondLevel, totalTurns, easterEggsFound, pendingLevelUp, incrementTurn, recordEasterEgg, dismissLevelUp } =
    useBond(user?.id, agentId);
  const { canChat, chatCount, chatLimit, plan, freeTrialExpired, incrementChat } = useSubscription(user?.id, user?.created_at);
  const { newlyUnlocked, checkAchievements, dismissAchievement } = useAchievements(user?.id);

  // Load energy from bond
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("agent_bonds")
        .select("energy_bits")
        .eq("user_id", user.id)
        .eq("agent_id", agentId)
        .maybeSingle();
      if (data) setEnergyBits(data.energy_bits);
    };
    load();
  }, [user, agentId]);

  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (!scrollRef.current) return;
    const behavior = initialScrollDone.current ? "smooth" : "instant";
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    if (!initialScrollDone.current && messages.length > 0) {
      initialScrollDone.current = true;
    }
  }, [messages, isStreaming]);

  const hasAssessmentContext = !!(mbtiResult || emotionResult || enneagramResult || zodiacResult || tarotResult || compatibilityResult);

  useEffect(() => {
    if (!user) {
      setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);
      setHistoryLoaded(true);
      return;
    }

    const loadConversationAndMemories = async () => {
      if (hasAssessmentContext) {
        setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);

        const [{ data: memories }, { data: summaries }] = await Promise.all([
          supabase
            .from("user_memories")
            .select("content, emotion_tag, category, created_at")
            .eq("user_id", user.id)
            .eq("agent_id", agentId)
            .order("importance", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("conversation_summaries")
            .select("summary, key_topics")
            .eq("user_id", user.id)
            .eq("agent_id", agentId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const memCtx: string[] = [];
        const isZh = locale === "zh";
        if (mbtiResult) {
          if (isZh) {
            let s = `[刚刚完成测评] 用户完成了 MBTI 测评：${mbtiResult.mbtiType}（${mbtiResult.title}）。描述：${mbtiResult.description}`;
            if (mbtiResult.parallelUniverse) {
              s += `。平行宇宙：奇幻—${mbtiResult.parallelUniverse.magic?.role}，赛博朋克—${mbtiResult.parallelUniverse.cyberpunk?.role}`;
            }
            memCtx.push(s);
          } else {
            let s = `[Just assessed] User completed MBTI assessment: ${mbtiResult.mbtiType} (${mbtiResult.title}). Description: ${mbtiResult.description}`;
            if (mbtiResult.parallelUniverse) {
              s += `. Parallel universe: Fantasy-${mbtiResult.parallelUniverse.magic?.role}, Cyberpunk-${mbtiResult.parallelUniverse.cyberpunk?.role}`;
            }
            memCtx.push(s);
          }
        }
        if (emotionResult) {
          memCtx.push(isZh
            ? `[刚刚完成测评] 用户完成了心灵体验测评：${emotionResult.emotionLevel}（${emotionResult.title}）。${emotionResult.description}。倦怠 ${emotionResult.traits.burnout}%、能量 ${emotionResult.traits.energy}%、边界 ${emotionResult.traits.boundaries}%、睡眠 ${emotionResult.traits.sleep}%。建议：${emotionResult.suggestions.join("；")}`
            : `[Just assessed] User completed Wellness Check: ${emotionResult.emotionLevel} (${emotionResult.title}). ${emotionResult.description}. Burnout ${emotionResult.traits.burnout}%, Energy ${emotionResult.traits.energy}%, Boundaries ${emotionResult.traits.boundaries}%, Sleep ${emotionResult.traits.sleep}%. Suggestions: ${emotionResult.suggestions.join("; ")}`);
        }
        if (enneagramResult) {
          memCtx.push(isZh
            ? `[刚刚完成测评] 用户完成了九型人格测评：${enneagramResult.type}号${enneagramResult.wing ? `（侧翼 ${enneagramResult.wing}）` : ""}—${enneagramResult.title}。${enneagramResult.description}。核心恐惧：${enneagramResult.coreFear}。核心渴望：${enneagramResult.coreDesire}。成长路径：${enneagramResult.growthPath}。压力下：${enneagramResult.stressArrow}。建议：${enneagramResult.advice}`
            : `[Just assessed] User completed Enneagram assessment: Type ${enneagramResult.type}${enneagramResult.wing ? ` (wing ${enneagramResult.wing})` : ""} — ${enneagramResult.title}. ${enneagramResult.description}. Core fear: ${enneagramResult.coreFear}. Core desire: ${enneagramResult.coreDesire}. Growth path: ${enneagramResult.growthPath}. Under stress: ${enneagramResult.stressArrow}. Advice: ${enneagramResult.advice}`);
        }
        if (zodiacResult) {
          const adv = typeof zodiacResult.advice === "string" ? zodiacResult.advice : JSON.stringify(zodiacResult.advice);
          memCtx.push(isZh
            ? `[刚刚完成测评] 用户完成了星座解读：${zodiacResult.zodiacSign}（${zodiacResult.element}）—${zodiacResult.title}。${zodiacResult.description}。特质：${JSON.stringify(zodiacResult.traits)}。建议：${adv}`
            : `[Just assessed] User completed Zodiac reading: ${zodiacResult.zodiacSign} (${zodiacResult.element}) — ${zodiacResult.title}. ${zodiacResult.description}. Traits: ${JSON.stringify(zodiacResult.traits)}. Advice: ${adv}`);
        }
        if (tarotResult) {
          memCtx.push(isZh
            ? `[刚刚完成测评] 用户刚抽了一张塔罗牌：${tarotResult.cardName}（${tarotResult.isReversed ? "逆位" : "正位"}），能量值 ${tarotResult.energyScore}。解读：${tarotResult.interpretation}。行动建议：${tarotResult.actionTip}`
            : `[Just assessed] User just drew a tarot card: ${tarotResult.cardName} (${tarotResult.isReversed ? "Reversed" : "Upright"}), energy ${tarotResult.energyScore}. Interpretation: ${tarotResult.interpretation}. Action tip: ${tarotResult.actionTip}`);
        }
        if (compatibilityResult) {
          const c = compatibilityResult;
          memCtx.push(isZh
            ? `[刚刚完成测评] 用户完成了与 ${c.partnerName}${c.partnerMbti ? `（${c.partnerMbti}）` : ""}${c.partnerZodiac ? ` ${c.partnerZodiac}` : ""} 的缘分配对。整体匹配度 ${c.overallScore}%—${c.title}。${c.summary}。优势：${c.strengths.join("；")}。冲突点：${c.conflicts.join("；")}。爱的语言——我的：${c.loveLanguage.mine}，对方：${c.loveLanguage.partner}。建议：${c.loveLanguage.tip}。${c.deepAnalysis ? ` 深度分析：${c.deepAnalysis.slice(0, 800)}` : ""}`
            : `[Just assessed] User completed Compatibility analysis with ${c.partnerName}${c.partnerMbti ? ` (${c.partnerMbti})` : ""}${c.partnerZodiac ? ` ${c.partnerZodiac}` : ""}. Overall ${c.overallScore}% — ${c.title}. ${c.summary}. Strengths: ${c.strengths.join("; ")}. Conflicts: ${c.conflicts.join("; ")}. Love language — mine: ${c.loveLanguage.mine}, partner: ${c.loveLanguage.partner}. Tip: ${c.loveLanguage.tip}.${c.deepAnalysis ? ` Deep analysis: ${c.deepAnalysis.slice(0, 800)}` : ""}`);
        }
        if (memories && memories.length > 0) {
          memories.forEach((m) => {
            const daysAgo = Math.floor((Date.now() - new Date(m.created_at || "").getTime()) / 86400000);
            const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
            memCtx.push(`[${timeLabel}] ${m.content}${m.emotion_tag ? ` (mood: ${m.emotion_tag})` : ""}`);
          });
        }
        if (summaries && summaries.length > 0) {
          summaries.forEach((s) => {
            memCtx.push(`[Summary] ${s.summary} (topics: ${(s.key_topics as string[] || []).join(", ")})`);
          });
        }
        setMemoryContext(memCtx);
        setHistoryLoaded(true);
        return;
      }

      const [convResult, memoriesResult, summariesResult] = await Promise.all([
        supabase
          .from("conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("user_memories")
          .select("content, emotion_tag, category, created_at")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .order("importance", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("conversation_summaries")
          .select("summary, key_topics")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const convData = convResult.data;

      if (convData) {
        const { data: msgData } = await supabase
          .from("chat_messages")
          .select("id, role, content, created_at")
          .eq("conversation_id", convData.id)
          .order("created_at", { ascending: true });

        if (msgData && msgData.length > 0) {
          setConversationId(convData.id);
          setMessages(msgData.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
        } else {
          setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);
        }
      } else {
        setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);
      }

      const memories = memoriesResult.data;
      const summaries = summariesResult.data;
      const memCtx: string[] = [];
      if (memories && memories.length > 0) {
        memories.forEach((m) => {
          const daysAgo = Math.floor((Date.now() - new Date(m.created_at || "").getTime()) / 86400000);
          const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
          memCtx.push(`[${timeLabel}] ${m.content}${m.emotion_tag ? ` (mood: ${m.emotion_tag})` : ""}`);
        });
      }
      if (summaries && summaries.length > 0) {
        summaries.forEach((s) => {
          memCtx.push(`[Summary] ${s.summary} (topics: ${(s.key_topics as string[] || []).join(", ")})`);
        });
      }
      setMemoryContext(memCtx);
      setHistoryLoaded(true);
    };
    loadConversationAndMemories();
  }, [user, agentId]);

  useEffect(() => {
    if (mbtiResult && historyLoaded && !mbtiAutoSentRef.current && user) {
      mbtiAutoSentRef.current = true;
      setConversationId(null);
      if (locale === "zh") {
        const puText = mbtiResult.parallelUniverse
          ? `，听说在奇幻世界我会是${mbtiResult.parallelUniverse.magic?.role}，赛博朋克里则是${mbtiResult.parallelUniverse.cyberpunk?.role}`
          : "";
        handleSend(`我刚做完 MBTI 测试，结果是 ${mbtiResult.mbtiType}（${mbtiResult.title}）${puText}——想和我聊聊我的性格吗？✨`);
      } else {
        const puText = mbtiResult.parallelUniverse
          ? `, and apparently in a fantasy world I'd be a ${mbtiResult.parallelUniverse.magic?.role}, and in cyberpunk I'd be a ${mbtiResult.parallelUniverse.cyberpunk?.role}`
          : "";
        handleSend(`I just took the MBTI quiz and got ${mbtiResult.mbtiType} (${mbtiResult.title})${puText} — wanna talk about my personality? ✨`);
      }
    }
  }, [historyLoaded, mbtiResult, user]);

  useEffect(() => {
    if (emotionResult && historyLoaded && !emotionAutoSentRef.current && user) {
      emotionAutoSentRef.current = true;
      setConversationId(null);
      handleSend(locale === "zh"
        ? `我刚做完心灵体验测评，结果是「${emotionResult.emotionLevel}」——${emotionResult.title}。倦怠 ${emotionResult.traits.burnout}%、能量 ${emotionResult.traits.energy}%。能聊聊我现在的状态吗？🌈`
        : `I just did a Wellness Check and scored "${emotionResult.emotionLevel}" — ${emotionResult.title}. Burnout at ${emotionResult.traits.burnout}%, energy at ${emotionResult.traits.energy}%. Can we talk about how I'm doing? 🌈`);
    }
  }, [historyLoaded, emotionResult, user]);

  useEffect(() => {
    if (enneagramResult && historyLoaded && !enneagramAutoSentRef.current && user) {
      enneagramAutoSentRef.current = true;
      setConversationId(null);
      handleSend(locale === "zh"
        ? `我刚做完九型人格测评——我是 ${enneagramResult.type} 号（${enneagramResult.title}）。核心恐惧：${enneagramResult.coreFear}；核心渴望：${enneagramResult.coreDesire}。陪我一起聊聊吧 💭`
        : `I just did the Enneagram quiz — I'm Type ${enneagramResult.type} (${enneagramResult.title}). Core fear: ${enneagramResult.coreFear}; core desire: ${enneagramResult.coreDesire}. Wanna unpack this with me? 💭`);
    }
  }, [historyLoaded, enneagramResult, user]);

  useEffect(() => {
    if (zodiacResult && historyLoaded && !zodiacAutoSentRef.current && user) {
      zodiacAutoSentRef.current = true;
      setConversationId(null);
      handleSend(locale === "zh"
        ? `Luna，我刚拿到 ${zodiacResult.zodiacSign} 的解读——「${zodiacResult.title}」。能帮我看看这对我现在意味着什么吗？✨🌙`
        : `Luna, I just got my ${zodiacResult.zodiacSign} reading — "${zodiacResult.title}". Can you read into what this means for me right now? ✨🌙`);
    }
  }, [historyLoaded, zodiacResult, user]);

  useEffect(() => {
    if (tarotResult && historyLoaded && !tarotAutoSentRef.current && user) {
      tarotAutoSentRef.current = true;
      setConversationId(null);
      handleSend(locale === "zh"
        ? `Luna，我今天抽到了 ${tarotResult.cardName}（${tarotResult.isReversed ? "逆位" : "正位"}）。这张牌对我到底意味着什么？🔮`
        : `Luna, I just drew ${tarotResult.cardName} (${tarotResult.isReversed ? "reversed" : "upright"}) today. What does it really mean for me? 🔮`);
    }
  }, [historyLoaded, tarotResult, user]);

  useEffect(() => {
    if (compatibilityResult && historyLoaded && !compatibilityAutoSentRef.current && user) {
      compatibilityAutoSentRef.current = true;
      setConversationId(null);
      handleSend(locale === "zh"
        ? `我刚做了和 ${compatibilityResult.partnerName} 的缘分配对——我们匹配度 ${compatibilityResult.overallScore}%（${compatibilityResult.title}）。说点实话，我接下来到底该怎么办？💕`
        : `I just ran a compatibility report with ${compatibilityResult.partnerName} — we matched ${compatibilityResult.overallScore}% (${compatibilityResult.title}). Tell me real talk, what should I actually do with this? 💕`);
    }
  }, [historyLoaded, compatibilityResult, user]);

  const startNewConversation = useCallback(() => {
    if (conversationId && messages.length > 4 && user) {
      const msgs = messages.filter((m) => m.id !== "welcome");
      supabase.functions.invoke("summarize-conversation", {
        body: { messages: msgs, agentId, userId: user.id, locale },
      });
    }
    setConversationId(null);
    setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);
  }, [conversationId, messages, user, agentId, agent, locale]);

  const ensureConversation = useCallback(async () => {
    if (conversationId || !user) return conversationId;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, agent_id: agentId, title: `Chat with ${agent.name}` })
      .select("id")
      .single();
    if (error) {
      console.error("Create conversation error:", error);
      return null;
    }
    setConversationId(data.id);
    return data.id;
  }, [conversationId, user, agentId, agent.name]);

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from("chat_messages").insert({ conversation_id: convId, role, content });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  };

  const updateEnergy = useCallback(async (gain: number) => {
    if (!user) return;
    const newBits = energyBits + gain;
    setEnergyBits(newBits);
    setLastEnergyGain(gain);
    setShowEnergyFloat(true);
    setTimeout(() => setShowEnergyFloat(false), 2000);

    await supabase
      .from("agent_bonds")
      .update({ energy_bits: newBits })
      .eq("user_id", user.id)
      .eq("agent_id", agentId);
  }, [user, agentId, energyBits]);

  const saveTruthShard = useCallback(async (shard: { title: string; description: string }) => {
    if (!user) return;
    await supabase.from("story_vault").insert({
      user_id: user.id,
      agent_id: agentId,
      type: "truth_shard",
      title: shard.title,
      content: shard.description,
      icon: "🔮",
    });
  }, [user, agentId]);

  const handleSend = async (directText?: string) => {
    const text = directText || input.trim();
    if (!text || isStreaming) return;

    // Anonymous mode: allow first ANON_MSG_LIMIT messages without login
    if (!user) {
      const userMsgCount = messages.filter(m => m.role === "user").length;
      if (userMsgCount >= ANON_MSG_LIMIT) {
        promptLogin(t("chat.anonLimitPrompt"));
        return;
      }
      // Anonymous: skip DB ops, just chat locally
      const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      const apiMessages: Msg[] = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: userMsg.content });

      let assistantContent = "";
      const upsertAssistant = (chunk: string) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id === "streaming") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
          }
          return [...prev, { id: "streaming", role: "assistant", content: assistantContent }];
        });
      };

      try {
        await streamChat({
          messages: apiMessages,
          agentId,
          memoryContext: [],
          bondLevel: 1,
          accessToken: session?.access_token,
          locale,
          unlockedShards: [],
          onDelta: upsertAssistant,
          onDone: () => {
            const { cleanContent, branchOptions: parsedOptions } = parseGameMarkers(assistantContent);
            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === "streaming"
                  ? { ...m, id: Date.now().toString(), content: cleanContent, branchOptions: parsedOptions }
                  : m
              )
            );
          },
          onError: (error) => {
            setIsStreaming(false);
            setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
            toast.error(error);
          },
        });
      } catch {
        setIsStreaming(false);
        toast.error(t("common.networkError"));
      }
      return;
    }

    if (!canChat) {
      if (freeTrialExpired) {
        toast.error(t("chat.freeEndedToast"));
      } else {
        toast.error(t("chat.limitReached", { n: chatLimit, plan: plan === "plus" ? "Plus" : "Free" }));
      }
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    await incrementChat();

    const convId = await ensureConversation();
    if (convId) saveMessage(convId, "user", userMsg.content);

    // Mystic tarot draw: detect intent and insert a card before AI reply
    let drawnCardContext = "";
    if (agentId === "mystic" && isTarotDrawIntent(text)) {
      const cardMsgId = `card-${Date.now()}`;
      setMessages((prev) => [...prev, { id: cardMsgId, role: "assistant", content: "", kind: "tarot-card", tarotCard: null }]);
      try {
        const { data: drawn, error: drawErr } = await supabase.functions.invoke("chat-tarot-draw", { body: {} });
        if (drawErr || !drawn) throw drawErr || new Error("draw failed");
        const card: InlineTarotCard = {
          cardName: drawn.cardName,
          cardNameCn: drawn.cardNameCn,
          emoji: drawn.emoji,
          isReversed: drawn.isReversed,
          keywords: drawn.keywords || [],
          imageUrl: drawn.imageUrl,
          imageStatus: drawn.imageStatus,
        };
        setMessages((prev) => prev.map((m) => (m.id === cardMsgId ? { ...m, tarotCard: card } : m)));
        const positionZh = card.isReversed ? "逆位" : "正位";
        const positionEn = card.isReversed ? "Reversed" : "Upright";
        drawnCardContext = locale === "zh"
          ? `\n\n[牌阵指引：用户刚在你的指引下抽到 ${card.cardNameCn}（${positionZh}），关键词：${card.keywords.join("、")}。请用你直觉、温暖的塔罗师口吻围绕这张牌给出 80-150 字解读，结合用户的提问语境，最后以一个开放性问题收尾。不要复述"你抽到了…"这种描述，直接进入解读。]`
          : `\n\n[Spread context: User just drew ${card.cardName} (${positionEn}) under your guidance. Keywords: ${card.keywords.join(", ")}. Respond in your intuitive, warm tarot voice with an 80-150 word reading around this card, tying it to their question. End with one open question. Don't recite "you drew…" — go straight into the reading.]`;
      } catch (err) {
        console.error("[Chat] tarot draw error", err);
        setMessages((prev) => prev.filter((m) => m.id !== cardMsgId));
        toast.error(locale === "zh" ? "牌堆暂时无法响应，Luna 会直接为你解读。" : "Card deck unavailable; Luna will read intuitively.");
      }
    }

    const apiMessages: Msg[] = messages
      .filter((m) => m.id !== "welcome" && m.kind !== "tarot-card")
      .map((m) => ({ role: m.role, content: m.content }));
    apiMessages.push({ role: "user", content: userMsg.content + drawnCardContext });

    let assistantContent = "";

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === "streaming") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { id: "streaming", role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: apiMessages,
        agentId,
        memoryContext,
        bondLevel,
        accessToken: session?.access_token,
        locale,
        unlockedShards: easterEggsFound,
        onDelta: upsertAssistant,
        onDone: async () => {
          console.log("[Chat] raw AI response:", assistantContent.slice(-200));
          const { cleanContent, energyGain, branchOptions: parsedOptions, truthShard, atmosphere: newAtmosphere } = parseGameMarkers(assistantContent);
          
          let finalBranchOptions: BranchOption[] | null = null;
          if (parsedOptions && parsedOptions.length > 0) {
            finalBranchOptions = parsedOptions;
          } else {
            const assistantMsgsWithOptions = messages.filter(
              m => m.role === "assistant" && m.branchOptions && m.branchOptions.length > 0
            );
            const lastOptionsIdx = assistantMsgsWithOptions.length > 0
              ? messages.indexOf(assistantMsgsWithOptions[assistantMsgsWithOptions.length - 1])
              : -1;
            const assistantsSinceLast = messages
              .slice(lastOptionsIdx + 1)
              .filter(m => m.role === "assistant").length;
            if (assistantsSinceLast + 1 >= 3) {
              finalBranchOptions = generateFallbackOptions(agentId, [...apiMessages, { role: "assistant", content: cleanContent }], t);
            }
          }
          
          console.log("[Chat] parsed markers:", { branchOptions: finalBranchOptions?.length, fromAI: !!(parsedOptions && parsedOptions.length > 0), energyGain, atmosphere: newAtmosphere });

          if (newAtmosphere) setAtmosphere(newAtmosphere);
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === "streaming"
                ? { ...m, id: Date.now().toString(), content: cleanContent, branchOptions: finalBranchOptions }
                : m
            )
          );

          if (energyGain) {
            await updateEnergy(energyGain);
          }

          if (truthShard) {
            setPendingShard(truthShard);
            setShowShard(true);
            await saveTruthShard(truthShard);
          }

          if (assistantContent.includes(EASTER_EGG_MARKER)) {
            setShowEasterEgg(true);
            for (const egg of agent.easterEggs) {
              if (userMsg.content.includes(egg.trigger)) {
                recordEasterEgg(egg.trigger);
                break;
              }
            }
          }

          await incrementTurn();
          await checkAchievements();

          if (convId && assistantContent) {
            saveMessage(convId, "assistant", assistantContent);
          }
        },
        onError: (error) => {
          setIsStreaming(false);
          setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
          toast.error(error);
        },
      });
    } catch (e) {
      setIsStreaming(false);
      toast.error(t("common.networkError"));
    }
  };

  const conversationIdRef = useRef(conversationId);
  const messagesRef = useRef(messages);
  const userRef = useRef(user);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    return () => {
      const cid = conversationIdRef.current;
      const msgs = messagesRef.current;
      const u = userRef.current;
      if (cid && msgs.length > 4 && u) {
        const filtered = msgs.filter((m) => m.id !== "welcome");
        const turnCount = filtered.filter(m => m.role === "user").length;
        supabase.functions.invoke("summarize-conversation", {
          body: { messages: filtered, agentId, userId: u.id, locale },
        }).then(({ data }) => {
          if (data && u) {
            supabase.from("conversation_summaries").insert({
              user_id: u.id,
              agent_id: agentId,
              conversation_id: cid,
              summary: data.summary,
              key_topics: data.key_topics,
            });
            if (turnCount >= 6) {
              generateSoulFragment(u.id, "chat", agentId, `Chat summary with ${agent.name}: ${data.summary}`);
            }
          }
        });
      }
    };
  }, [agentId, agent.name]);

  const levelUpLore = pendingLevelUp ? agent.lore.find((l) => l.level === pendingLevelUp)?.text || "" : "";

  const handleLongPressStart = useCallback((content: string) => {
    longPressTimer.current = setTimeout(async () => {
      toast.info(t("chat.quoteCardLoading"));
      const accentMap: Record<string, string> = {
        barista: "#e8a87c",
        jax: "#f59e0b",
        mystic: "#8b5cf6",
        bestie: "#6366f1",
      };
      try {
        const dataUrl = await generateQuoteCard({
          quote: content.slice(0, 200),
          agentName: agent.name,
          agentTitle: agent.title,
          agentImage: agent.image,
          accentColor: accentMap[agentId] || "#8b5cf6",
        });
        setShareImageUrl(dataUrl);
        setShareOpen(true);
      } catch {
        toast.error(t("chat.cardFail"));
      }
    }, 600);
  }, [agent, agentId, generateQuoteCard]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div className="md:ml-[220px] flex">
    {/* Desktop sidebar nav */}
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] flex-col border-r border-border bg-card/80 backdrop-blur-xl z-50">
      <div className="px-5 pt-8 pb-6">
        <h1 className="font-display text-lg font-bold text-foreground">{t("chat.headerTitle")}</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">{t("chat.headerSub")}</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {[
          { icon: "🏠", label: t("nav.home"), path: "/" },
          { icon: "📖", label: t("nav.archive"), path: "/archive" },
          { icon: "✨", label: t("nav.assess"), path: "/assessment" },
          { icon: "👤", label: t("nav.me"), path: "/profile" },
        ].map((item) => (
          <button key={item.path} onClick={() => navigate(item.path)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <span>{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-border"><p className="text-[10px] text-muted-foreground">islandai.life</p></div>
    </aside>

    <div className={`flex h-screen flex-col flex-1 min-w-0 overflow-x-hidden chat-theme-${agentId} relative`} style={{ background: dynamicBg || 'var(--chat-bg, hsl(40 30% 97%))' }}>
      <SEO title={`${agent.name} — ${t("home.appName")}`} description={`Chat with ${agent.name}, an AI companion who listens without judgement. Explore conversations, memories, and hidden story fragments.`} />
      <ChatParticles atmosphere={atmosphere} onBgChange={setDynamicBg} />
      <div className="border-b border-border backdrop-blur-xl px-4 py-3" style={{ backgroundColor: 'var(--chat-header-bg, hsl(0 0% 0% / 0.03))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setProfileOpen(true)} className="shrink-0 active:scale-95 transition-transform">
            <img src={agent.image} alt={agent.name} className="h-9 w-9 rounded-xl object-cover" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground truncate">{agent.name}</h2>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={startNewConversation}
                  className="rounded-lg bg-muted/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted active:scale-95"
                  title={t("chat.newConv")}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-1 rounded-lg bg-secondary/10 px-2 py-1">
                  <Zap className="h-3 w-3 text-secondary" />
                  <span className="text-[11px] font-bold text-secondary">{energyBits}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5 min-w-0">
              <p className="text-[11px] text-muted-foreground truncate min-w-0">{agent.title} · {t("chat.online")}</p>
              <div className="shrink-0">
                <BondIndicator level={bondLevel} totalTurns={totalTurns} energyBits={energyBits} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <EnergyFloat gain={lastEnergyGain} show={showEnergyFloat} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.kind === "tarot-card" ? (
                <TarotCardInline card={msg.tarotCard ?? null} />
              ) : (
              <div className="flex flex-col max-w-[75%] md:max-w-[60%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed select-none ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card text-card-foreground shadow-card rounded-bl-md"
                  } ${msg.content.includes(EASTER_EGG_MARKER) ? "ring-2 ring-secondary/50 shadow-glow" : ""}`}
                  {...(msg.role === "assistant" && msg.id !== "welcome" && msg.id !== "streaming"
                    ? {
                        onTouchStart: () => handleLongPressStart(msg.content),
                        onTouchEnd: handleLongPressEnd,
                        onTouchCancel: handleLongPressEnd,
                        onContextMenu: (e: React.MouseEvent) => {
                          e.preventDefault();
                          handleLongPressStart(msg.content);
                        },
                      }
                    : {})}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-card-foreground prose-p:my-1 prose-headings:my-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && msg.branchOptions && msg.branchOptions.length > 0 && !isStreaming && (
                  <BranchSelector options={msg.branchOptions} onSelect={handleSend} />
                )}
              </div>
              )}
            </motion.div>
          ))}
          {messages.length === 1 && messages[0].id === "welcome" && !isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mx-auto flex items-center gap-2 rounded-2xl bg-secondary/5 border border-secondary/15 px-3 py-2 max-w-[85%]"
            >
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                {t("chat.energyHint", { name: agent.name })}<span className="text-secondary font-medium">{t(`home.bondLabels.${(["stranger","acquaintance","trusted","close","soulbound"][bondLevel - 1]) || "stranger"}`)}</span>
              </span>
            </motion.div>
          )}
          {messages.length === 1 && messages[0].id === "welcome" && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-2 pl-1"
            >
              {(quickReplies[agentId] || []).map((text) => (
                <button
                  key={text}
                  onClick={() => handleSend(text)}
                  className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10 active:scale-95"
                >
                  {text}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex gap-1 rounded-2xl bg-card px-4 py-3 shadow-card rounded-bl-md">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}
      </div>

      <EasterEggEffect
        show={showEasterEgg}
        onComplete={() => setShowEasterEgg(false)}
      />

      <TruthShardPopup
        shard={pendingShard}
        show={showShard}
        onClose={() => {
          setShowShard(false);
          setPendingShard(null);
        }}
      />

      <div className="border-t border-border backdrop-blur-xl px-4 py-3" style={{ backgroundColor: 'var(--chat-header-bg, hsl(0 0% 0% / 0.03))' }}>
        <div className="flex items-center gap-2">
          <button className="shrink-0 rounded-xl bg-muted p-2.5 text-muted-foreground">
            <Mic className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center rounded-2xl border border-border bg-background px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={t("chat.inputPlaceholder")}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              disabled={isStreaming}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 rounded-xl bg-gradient-golden p-2.5 text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      <BondLevelUp
        show={!!pendingLevelUp}
        level={pendingLevelUp || 1}
        agentName={agent.name}
        loreText={levelUpLore}
        onClose={dismissLevelUp}
      />

      <AchievementUnlock achievement={newlyUnlocked} onClose={dismissAchievement} />

      <AgentProfileDrawer
        agent={agent}
        bondLevel={bondLevel}
        totalTurns={totalTurns}
        easterEggsFound={easterEggsFound}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      <ShareSheet
        open={shareOpen}
        onClose={() => { setShareOpen(false); setShareImageUrl(null); }}
        imageDataUrl={shareImageUrl}
        title={t("chat.saysSuffix", { name: agent.name })}
        text={t("chat.via")}
      />
    </div>

    {/* Desktop right panel — Agent Profile */}
    <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-l border-border bg-card/50 backdrop-blur-sm h-screen sticky top-0 overflow-y-auto">
      <div className="p-5 text-center border-b border-border">
        <img src={agent.image} alt={agent.name} className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-card" />
        <h3 className="mt-3 font-display text-base font-semibold text-foreground">{agent.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{agent.title}</p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{t("chat.bondLevel")}</span>
            <span className="text-secondary font-medium">{t(`home.bondLabels.${(["stranger","acquaintance","trusted","close","soulbound"][bondLevel - 1]) || "stranger"}`)}</span>
          </div>
          <BondIndicator level={bondLevel} totalTurns={totalTurns} energyBits={energyBits} />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">{t("chat.energy")}</span>
          <div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-secondary" /><span className="text-sm font-bold text-secondary">{energyBits}</span></div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-2">{t("chat.storyFragments")}</h4>
          <div className="space-y-2">
            {agent.lore.map((loreEntry, index) => {
              const isUnlocked = index + 1 <= bondLevel;
              return (
                <div key={loreEntry.level} className={`rounded-xl p-3 text-xs leading-relaxed ${isUnlocked ? "bg-secondary/5 text-foreground border border-secondary/10" : "bg-muted/30 text-muted-foreground/40"}`}>
                  <span className="text-[10px] font-medium text-muted-foreground">Lv.{loreEntry.level}</span>
                  <p className="mt-1">{isUnlocked ? `"${loreEntry.text.slice(0, 80)}…"` : "???"}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>

    </div>
  );
};

export default Chat;
