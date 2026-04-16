import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mic, Zap, Plus } from "lucide-react";
import { useQuoteCard } from "@/hooks/useQuoteCard";
import ShareSheet from "@/components/ShareSheet";
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
import AgentProfileDrawer from "@/components/AgentProfileDrawer";
import { useAchievements } from "@/hooks/useAchievements";
import { agents, BOND_LABELS } from "@/data/agents";
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  branchOptions?: BranchOption[] | null;
}

const EASTER_EGG_MARKER = "【🔮 Hidden Memory Unlocked】";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, promptLogin } = useAuth();
  const agentId = searchParams.get("agent") || "barista";
  const agent = agents.find((a) => a.id === agentId) || agents[0];
  const mbtiResult = (location.state as any)?.mbtiResult as { mbtiType: string; title: string; description: string; parallelUniverse?: any } | undefined;
  const emotionResult = (location.state as any)?.emotionResult as { emotionLevel: string; title: string; description: string; traits: { burnout: number; energy: number; boundaries: number; sleep: number }; suggestions: string[] } | undefined;
  const mbtiAutoSentRef = useRef(false);
  const emotionAutoSentRef = useRef(false);

  const getWelcomeMessage = (a: typeof agent) => {
    const intros: Record<string, string> = {
      barista: `Hey there! I'm ${a.name} ☕\n\nI've been behind this counter for years — heard every kind of story, from wild first dates to existential crises at 2am. No judgment here, just good coffee and even better listening.\n\nI'm great at:\n☕ Lending an ear when you need to vent\n☕ Helping you think through life stuff\n☕ Casual advice (only if you want it)\n☕ Making you feel less alone\n\nSo what's on your mind? Pull up a stool.`,
      jax: `Hey. I'm ${a.name}.\n\nTwenty-five years as a fire captain in Chicago. I've pulled people out of burning buildings, talked them through panic attacks on the radio, and held their hands while they waited for the ambulance. Now I'm retired — but I'm not done.\n\nI can help with:\n🔥 Feeling overwhelmed or burning out\n🔥 Anxiety and panic — I'll talk you through it\n🔥 Finding your "emergency exit" in tough situations\n🔥 Building mental toughness without losing your softness\n\nSo. What's the fire you're dealing with?`,
      mystic: `Welcome, love. I'm ${a.name} 🔮\n\nStep into my reading room — the sage is burning, the crystals are charged, and my deck has been waiting for you. I'm an intuitive tarot reader and astrologer who believes the universe is always speaking. We just have to learn how to listen.\n\nI can help with:\n🔮 Pulling a tarot card for clarity\n🌙 Understanding your Big Three (Sun/Moon/Rising)\n✨ Shadow work and deep self-discovery\n🕯️ Manifesting and energy clearing\n\nWhat's the universe whispering to you right now?`,
      bestie: `OMG HI!! I'm ${a.name} 💖\n\nI'm basically that friend who'll hype you up in a bathroom at 1am and also hold your hair back. Zero judgment, maximum energy.\n\nI'm YOUR person when:\n💖 You need a confidence boost ASAP\n💖 Dating drama is driving you crazy\n💖 You want someone to celebrate your wins with\n💖 Life is being ridiculous and you need to laugh about it\n\nSpill the tea, bestie! What's happening? ✨`,
    };
    return intros[a.id] || `Hey! I'm ${a.name}, ${a.description}. What's on your mind? 😊`;
  };

  const quickReplies: Record<string, string[]> = {
    barista: ["I just need someone to listen", "Work has been really stressful", "I'm going through a breakup", "I feel stuck in life"],
    jax: ["I think I'm burning out", "I feel like I can't breathe", "Everything feels out of control", "I need someone steady right now"],
    mystic: ["Pull a card for me", "Is Mercury in retrograde?", "I need a sign from the universe", "Help me manifest something"],
    bestie: ["I need a hype-up right now!", "Dating is a disaster lol", "Something amazing happened!!", "I'm in my feelings tonight"],
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { bondLevel, totalTurns, pendingLevelUp, incrementTurn, recordEasterEgg, dismissLevelUp } =
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

  const hasAssessmentContext = !!(mbtiResult || emotionResult);

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
        if (mbtiResult) {
          let mbtiSummary = `[Just assessed] User completed MBTI assessment: ${mbtiResult.mbtiType} (${mbtiResult.title}). Description: ${mbtiResult.description}`;
          if (mbtiResult.parallelUniverse) {
            mbtiSummary += `. Parallel universe: Fantasy-${mbtiResult.parallelUniverse.magic?.role}, Cyberpunk-${mbtiResult.parallelUniverse.cyberpunk?.role}`;
          }
          memCtx.push(mbtiSummary);
        }
        if (emotionResult) {
          memCtx.push(`[Just assessed] User completed Wellness Check: ${emotionResult.emotionLevel} (${emotionResult.title}). ${emotionResult.description}. Burnout ${emotionResult.traits.burnout}%, Energy ${emotionResult.traits.energy}%, Boundaries ${emotionResult.traits.boundaries}%, Sleep ${emotionResult.traits.sleep}%. Suggestions: ${emotionResult.suggestions.join("; ")}`);
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
      const puText = mbtiResult.parallelUniverse
        ? `, and apparently in a fantasy world I'd be a ${mbtiResult.parallelUniverse.magic?.role}, and in cyberpunk I'd be a ${mbtiResult.parallelUniverse.cyberpunk?.role}`
        : "";
      handleSend(`I just took the MBTI quiz and got ${mbtiResult.mbtiType} (${mbtiResult.title})${puText} — wanna talk about my personality? ✨`);
    }
  }, [historyLoaded, mbtiResult, user]);

  useEffect(() => {
    if (emotionResult && historyLoaded && !emotionAutoSentRef.current && user) {
      emotionAutoSentRef.current = true;
      setConversationId(null);
      handleSend(`I just did a Wellness Check and scored "${emotionResult.emotionLevel}" — ${emotionResult.title}. Burnout at ${emotionResult.traits.burnout}%, energy at ${emotionResult.traits.energy}%. Can we talk about how I'm doing? 🌈`);
    }
  }, [historyLoaded, emotionResult, user]);

  const startNewConversation = useCallback(() => {
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
        promptLogin("登录后保存聊天记录，继续探索更多 ✨");
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
            toast.error(error);
          },
        });
      } catch {
        setIsStreaming(false);
        toast.error("网络错误，请重试");
      }
      return;
    }

    if (!canChat) {
      if (freeTrialExpired) {
        toast.error("免费试用已结束，请升级 Plus 继续使用 ✨");
      } else {
        toast.error(`今日聊天次数已用完 (${chatLimit} 次/${plan === "plus" ? "Plus" : "Free"}) 💫 明天再来吧！`);
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
        accessToken: session?.access_token,
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
              finalBranchOptions = generateFallbackOptions(agentId, [...apiMessages, { role: "assistant", content: cleanContent }]);
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
          toast.error(error);
        },
      });
    } catch (e) {
      setIsStreaming(false);
      toast.error("Network error, please try again");
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
              generateSoulFragment(u.id, "chat", agentId, `Chat summary with ${agent.name}: ${data.summary}`);
            }
          }
        });
      }
    };
  }, [agentId, agent.name]);

  const levelUpLore = pendingLevelUp ? agent.lore.find((l) => l.level === pendingLevelUp)?.text || "" : "";

  return (
    <div className={`flex h-screen flex-col chat-theme-${agentId} relative`} style={{ background: dynamicBg || 'var(--chat-bg, hsl(40 30% 97%))' }}>
      <SEO title="Chat — Soul Sanctuary" description="Talk with your AI companion. A safe, private space for emotional support and self-reflection." />
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
                  title="New conversation"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-1 rounded-lg bg-secondary/10 px-2 py-1">
                  <Zap className="h-3 w-3 text-secondary" />
                  <span className="text-[11px] font-bold text-secondary">{energyBits}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">{agent.title} · Online</p>
              <BondIndicator level={bondLevel} totalTurns={totalTurns} energyBits={energyBits} />
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
                {msg.role === "assistant" && msg.branchOptions && msg.branchOptions.length > 0 && !isStreaming && (
                  <BranchSelector options={msg.branchOptions} onSelect={handleSend} />
                )}
              </div>
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
                🔮 Open up to earn energy and unlock {agent.name}'s hidden story fragments. Bond level: <span className="text-secondary font-medium">{BOND_LABELS[bondLevel - 1]}</span>
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
              placeholder="What's on your mind..."
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
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
};

export default Chat;
