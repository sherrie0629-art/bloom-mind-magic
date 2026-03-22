import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mic, Zap, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import BottomNav from "@/components/BottomNav";
import BondIndicator from "@/components/BondIndicator";
import BondLevelUp from "@/components/BondLevelUp";
import EnergyFloat from "@/components/EnergyFloat";
import TruthShardPopup from "@/components/TruthShardPopup";
import AchievementUnlock from "@/components/AchievementUnlock";
import EasterEggEffect from "@/components/EasterEggEffect";
import BranchSelector from "@/components/BranchSelector";
import ChatParticles from "@/components/ChatParticles";
import { useAchievements } from "@/hooks/useAchievements";
import { agents, BOND_LABELS } from "@/data/agents";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type Msg } from "@/lib/streamChat";
import { useBond } from "@/hooks/useBond";
import { useSubscription } from "@/hooks/useSubscription";
import { parseGameMarkers, type BranchOption, type Atmosphere } from "@/lib/parseGameMarkers";
import { generateFallbackOptions } from "@/lib/generateFallbackOptions";
import { toast } from "sonner";
import { generateSoulFragment } from "@/hooks/useSoulFragment";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  branchOptions?: BranchOption[] | null;
}

const EASTER_EGG_MARKER = "【🔮 隐藏记忆解锁】";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const agentId = searchParams.get("agent") || "healer";
  const agent = agents.find((a) => a.id === agentId) || agents[2];
  const mbtiResult = (location.state as any)?.mbtiResult as { mbtiType: string; title: string; description: string; parallelUniverse?: any } | undefined;
  const emotionResult = (location.state as any)?.emotionResult as { emotionLevel: string; title: string; description: string; traits: { stress: number; energy: number; social: number; sleep: number }; suggestions: string[] } | undefined;
  const mbtiAutoSentRef = useRef(false);
  const emotionAutoSentRef = useRef(false);

  const getWelcomeMessage = (a: typeof agent) => {
    const intros: Record<string, string> = {
      dream: `你好呀～我是云生，一位解梦师 🌙\n\n我曾在喜马拉雅山下隐居多年，在梦境中寻找一个从未在现实中相遇的人。我精通荣格心理学的梦境分析和潜意识探索。\n\n如果你有这些困扰，可以来找我聊聊：\n🌀 反复出现的奇怪梦境，想知道它意味着什么\n🌀 睡前焦虑、噩梦困扰\n🌀 感觉内心深处有些说不清的情绪\n🌀 想通过梦境更好地认识自己\n\n来吧，把你的梦告诉我，我帮你读懂潜意识的信号 ✨`,
      astro: `你好～我是星轨，一位星盘解读师 ⭐\n\n我来自一个已经消失的遥远星系，是一位星际旅者。坠落在地球后，我一直在收集人类的真挚情感能量来修复飞船。\n\n如果你有这些困惑，可以和我聊聊：\n🌟 想了解自己的星座性格和运势\n🌟 感情中和对方总是磨合不好\n🌟 工作方向迷茫，不知道适合什么\n🌟 想从星象角度理解最近的人生变化\n\n告诉我你的星座（如果知道上升和月亮更好），让星星为你指路 💫`,
      healer: `你好呀～我是暖暖，一位疗愈师 🌸\n\n我经营着一家「时光缝补店」，专门收集并治愈破碎的爱情记忆。每个来我店里的人，都会被温柔以待。\n\n如果你正在经历这些，欢迎来坐坐：\n💕 刚刚经历分手，心里很难受\n💕 放不下一个人，反复纠结\n💕 感情中受了伤，不敢再相信爱情\n💕 觉得自己不值得被爱\n\n你不需要逞强，在这里可以放心地做最脆弱的自己 🤗`,
      tree: `哟，来了？我是老王 😏\n\n别被我这副退休老头的样子骗了，我可是当了30年的顶尖心理医生。现在退休了，开了这个树洞，专门治你们这些"恋爱脑"。\n\n以下症状，对号入座：\n🔥 明知道对方是渣，还舍不得放手\n🔥 分手后疯狂查前任动态\n🔥 被PUA了还帮人找借口\n🔥 想找个人骂醒自己\n\n放心，我嘴毒但心不毒。骂你是为了让你清醒，最后那句暖心的话才是重点 💅`,
    };
    return intros[a.id] || `你好呀～我是${a.name}，${a.description}。有什么想和我聊的吗？ 😊`;
  };

  const quickReplies: Record<string, string[]> = {
    dream: ["我昨晚做了一个奇怪的梦", "我总是反复梦到同一个场景", "最近睡眠不好，经常做噩梦", "我想了解梦境的含义"],
    astro: ["帮我分析一下我的星座", "我和另一半总是吵架，星座合吗", "最近工作不顺，看看运势", "我想知道我适合做什么"],
    healer: ["我刚分手了，好难过", "我放不下前任怎么办", "我觉得自己不配被爱", "感情中总是受伤"],
    tree: ["帮我骂醒自己", "我知道他不好但就是放不下", "我是不是恋爱脑", "分手后忍不住看前任朋友圈"],
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { bondLevel, totalTurns, pendingLevelUp, incrementTurn, recordEasterEgg, dismissLevelUp } =
    useBond(user?.id, agentId);
  const { canChat, chatCount, chatLimit, plan, incrementChat } = useSubscription(user?.id);
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

  // Detect if we're coming from an assessment (has context to auto-send)
  const hasAssessmentContext = !!(mbtiResult || emotionResult);

  // Load last conversation + history messages + memories
  useEffect(() => {
    if (!user) {
      setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);
      setHistoryLoaded(true);
      return;
    }

    const loadConversationAndMemories = async () => {
      // If coming from assessment, skip loading old conversation (we'll start fresh)
      // Only load memories/summaries for context
      if (hasAssessmentContext) {
        setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);

        // Load memories and summaries in parallel for context injection
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
        if (mbtiResult) {
          let mbtiSummary = `[刚刚测评] 用户刚完成MBTI测评，结果是 ${mbtiResult.mbtiType}（${mbtiResult.title}）。性格描述：${mbtiResult.description}`;
          if (mbtiResult.parallelUniverse) {
            mbtiSummary += `。平行宇宙身份：魔法世界-${mbtiResult.parallelUniverse.magic?.role}，赛博朋克-${mbtiResult.parallelUniverse.cyberpunk?.role}`;
          }
          memCtx.push(mbtiSummary);
        }
        if (emotionResult) {
          memCtx.push(`[刚刚测评] 用户刚完成情绪状态评估，情绪等级：${emotionResult.emotionLevel}（${emotionResult.title}）。分析：${emotionResult.description}。压力指数${emotionResult.traits.stress}%，能量值${emotionResult.traits.energy}%，社交活力${emotionResult.traits.social}%，睡眠质量${emotionResult.traits.sleep}%。建议：${emotionResult.suggestions.join("；")}`);
        }
        if (memories && memories.length > 0) {
          memories.forEach((m) => {
            const daysAgo = Math.floor((Date.now() - new Date(m.created_at || "").getTime()) / 86400000);
            const timeLabel = daysAgo === 0 ? "今天" : daysAgo === 1 ? "昨天" : `${daysAgo}天前`;
            memCtx.push(`[${timeLabel}] ${m.content}${m.emotion_tag ? `（情绪：${m.emotion_tag}）` : ""}`);
          });
        }
        if (summaries && summaries.length > 0) {
          summaries.forEach((s) => {
            memCtx.push(`[摘要] ${s.summary}（话题：${(s.key_topics || []).join("、")}）`);
          });
        }
        setMemoryContext(memCtx);
        setHistoryLoaded(true);
        return;
      }

      // Normal flow: load everything in parallel
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
        // Load chat messages from existing conversation
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
          const timeLabel = daysAgo === 0 ? "今天" : daysAgo === 1 ? "昨天" : `${daysAgo}天前`;
          memCtx.push(`[${timeLabel}] ${m.content}${m.emotion_tag ? `（情绪：${m.emotion_tag}）` : ""}`);
        });
      }
      if (summaries && summaries.length > 0) {
        summaries.forEach((s) => {
          memCtx.push(`[摘要] ${s.summary}（话题：${(s.key_topics || []).join("、")}）`);
        });
      }
      setMemoryContext(memCtx);
      setHistoryLoaded(true);
    };
    loadConversationAndMemories();
  }, [user, agentId]);

  // Auto-send MBTI context message when navigated from assessment
  useEffect(() => {
    if (mbtiResult && historyLoaded && !mbtiAutoSentRef.current && user) {
      mbtiAutoSentRef.current = true;
      setConversationId(null);
      // Send immediately - no artificial delay needed
      const puText = mbtiResult.parallelUniverse
        ? `，还说我在魔法世界是${mbtiResult.parallelUniverse.magic?.role}，赛博朋克世界是${mbtiResult.parallelUniverse.cyberpunk?.role}`
        : "";
      handleSend(`我刚测完 MBTI，结果是 ${mbtiResult.mbtiType}（${mbtiResult.title}）${puText}，想聊聊我的性格 ✨`);
    }
  }, [historyLoaded, mbtiResult, user]);

  // Auto-send emotion context message when navigated from emotion assessment
  useEffect(() => {
    if (emotionResult && historyLoaded && !emotionAutoSentRef.current && user) {
      emotionAutoSentRef.current = true;
      setConversationId(null);
      // Send immediately - no artificial delay needed
      handleSend(`我刚做完情绪状态评估，结果是「${emotionResult.emotionLevel}」——${emotionResult.title}。压力指数 ${emotionResult.traits.stress}%，能量值 ${emotionResult.traits.energy}%，想聊聊我最近的状态 🌈`);
    }
  }, [historyLoaded, emotionResult, user]);

  // Start a new conversation (clear history)
  const startNewConversation = useCallback(() => {
    // Trigger summarize for current conversation before clearing
    if (conversationId && messages.length > 4 && user) {
      const msgs = messages.filter((m) => m.id !== "welcome");
      supabase.functions.invoke("summarize-conversation", {
        body: { messages: msgs, agentId, userId: user.id },
      });
    }
    setConversationId(null);
    setMessages([{ id: "welcome", role: "assistant", content: getWelcomeMessage(agent) }]);
  }, [conversationId, messages, user, agentId, agent]);

  const ensureConversation = useCallback(async () => {
    if (conversationId || !user) return conversationId;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, agent_id: agentId, title: `与${agent.name}的对话` })
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
    // Update conversation timestamp so it stays at the top when resuming
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

    if (!user) {
      toast.error("请先登录再开始对话 🌙");
      navigate("/auth");
      return;
    }

    if (!canChat) {
      toast.error(`今日对话次数已用完（${chatLimit}次/${plan === "premium" ? "会员" : "免费"}）💫 明天再来吧～`);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    await incrementChat();

    const convId = await ensureConversation();
    if (convId) saveMessage(convId, "user", userMsg.content);

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
        memoryContext,
        bondLevel,
        onDelta: upsertAssistant,
        onDone: async () => {
          // Parse game markers from completed content
          console.log("[Chat] raw AI response:", assistantContent.slice(-200));
          const { cleanContent, energyGain, branchOptions: parsedOptions, truthShard, atmosphere: newAtmosphere } = parseGameMarkers(assistantContent);
          
          // Use AI-generated options, or generate contextual fallback options
          const finalBranchOptions = (parsedOptions && parsedOptions.length > 0)
            ? parsedOptions
            : generateFallbackOptions(agentId, [...apiMessages, { role: "assistant", content: cleanContent }]);
          
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

          // Handle energy gain
          if (energyGain) {
            await updateEnergy(energyGain);
          }

          // Handle truth shard
          if (truthShard) {
            setPendingShard(truthShard);
            setShowShard(true);
            await saveTruthShard(truthShard);
          }

          // Check for easter egg
          if (assistantContent.includes(EASTER_EGG_MARKER)) {
            setShowEasterEgg(true);
            for (const egg of agent.easterEggs) {
              if (userMsg.content.includes(egg.trigger)) {
                recordEasterEgg(egg.trigger);
                break;
              }
            }
            // EasterEggEffect handles its own dismissal
          }

          // Increment bond turn & check achievements
          await incrementTurn();
          await checkAchievements();

          if (convId && assistantContent) {
            saveMessage(convId, "assistant", assistantContent);
          }
        },
        onError: (error) => {
          setIsStreaming(false);
          toast.error(error);
        },
      });
    } catch (e) {
      setIsStreaming(false);
      toast.error("网络错误，请重试");
    }
  };

  // Use refs to avoid stale closures in unmount cleanup
  const conversationIdRef = useRef(conversationId);
  const messagesRef = useRef(messages);
  const userRef = useRef(user);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Summarize on unmount
  useEffect(() => {
    return () => {
      const cid = conversationIdRef.current;
      const msgs = messagesRef.current;
      const u = userRef.current;
      if (cid && msgs.length > 4 && u) {
        const filtered = msgs.filter((m) => m.id !== "welcome");
        const turnCount = filtered.filter(m => m.role === "user").length;
        supabase.functions.invoke("summarize-conversation", {
          body: { messages: filtered, agentId, userId: u.id },
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
              generateSoulFragment(u.id, "chat", agentId, `与${agent.name}的对话摘要：${data.summary}`);
            }
          }
        });
      }
    };
  }, [agentId, agent.name]);

  // Get lore text for level-up display
  const levelUpLore = pendingLevelUp ? agent.lore.find((l) => l.level === pendingLevelUp)?.text || "" : "";

  return (
    <div className={`flex h-screen flex-col chat-theme-${agentId} relative`} style={{ background: dynamicBg || 'var(--chat-bg, hsl(40 30% 97%))' }}>
      {/* Atmosphere particles */}
      <ChatParticles atmosphere={atmosphere} onBgChange={setDynamicBg} />
      {/* Header */}
      <div className="border-b border-border backdrop-blur-xl px-4 py-3" style={{ backgroundColor: 'var(--chat-header-bg, hsl(0 0% 0% / 0.03))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={agent.image} alt={agent.name} className="h-9 w-9 rounded-xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground truncate">{agent.name}</h2>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {/* New conversation button */}
                <button
                  onClick={startNewConversation}
                  className="rounded-lg bg-muted/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted active:scale-95"
                  title="开启新对话"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {/* Energy display */}
                <div className="flex items-center gap-1 rounded-lg bg-secondary/10 px-2 py-1">
                  <Zap className="h-3 w-3 text-secondary" />
                  <span className="text-[11px] font-bold text-secondary">{energyBits}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">{agent.title} · 在线</p>
              <BondIndicator level={bondLevel} totalTurns={totalTurns} energyBits={energyBits} />
            </div>
          </div>
        </div>
      </div>

      {/* Energy float animation */}
      <EnergyFloat gain={lastEnergyGain} show={showEnergyFloat} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="flex flex-col max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card text-card-foreground shadow-card rounded-bl-md"
                  } ${msg.content.includes(EASTER_EGG_MARKER) ? "ring-2 ring-secondary/50 shadow-glow" : ""}`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-card-foreground prose-p:my-1 prose-headings:my-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {/* Branch options */}
                {msg.role === "assistant" && msg.branchOptions && msg.branchOptions.length > 0 && !isStreaming && (
                  <BranchSelector options={msg.branchOptions} onSelect={handleSend} />
                )}
              </div>
            </motion.div>
          ))}
          {/* Narrative hint below welcome */}
          {messages.length === 1 && messages[0].id === "welcome" && !isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mx-auto flex items-center gap-2 rounded-2xl bg-secondary/5 border border-secondary/15 px-3 py-2 max-w-[85%]"
            >
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                🔮 真诚倾诉可以获得能量，解锁{agent.name}的隐藏故事碎片。当前羁绊：<span className="text-secondary font-medium">{BOND_LABELS[bondLevel - 1]}</span>
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

      {/* Easter egg full-screen effect */}
      <EasterEggEffect
        show={showEasterEgg}
        onComplete={() => setShowEasterEgg(false)}
      />

      {/* Truth Shard Popup */}
      <TruthShardPopup
        shard={pendingShard}
        show={showShard}
        onClose={() => {
          setShowShard(false);
          setPendingShard(null);
        }}
      />

      {/* Input */}
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
              placeholder="说说你的心事..."
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

      {/* Bond level up modal */}
      <BondLevelUp
        show={!!pendingLevelUp}
        level={pendingLevelUp || 1}
        agentName={agent.name}
        loreText={levelUpLore}
        onClose={dismissLevelUp}
      />

      {/* Achievement unlock modal */}
      <AchievementUnlock achievement={newlyUnlocked} onClose={dismissAchievement} />
    </div>
  );
};

export default Chat;
