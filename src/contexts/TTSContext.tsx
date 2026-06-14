import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SpeedOption = 0.85 | 1 | 1.15;

interface TTSContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  speed: SpeedOption;
  setSpeed: (v: SpeedOption) => void;
  loadingId: string | null;
  playingId: string | null;
  /** agentId currently associated with playback (for avatar halo) */
  activeAgentId: string | null;
  play: (params: { messageId: string; agentId: string; text: string }) => Promise<void>;
  stop: () => void;
}

const TTSContext = createContext<TTSContextValue | null>(null);

const LS_ENABLED = "tts.enabled";
const LS_SPEED = "tts.speed";
const LS_VOLUME = "tts.volume";

const cacheKey = (agentId: string, text: string, speed: number) =>
  `${agentId}::${speed}::${text.slice(0, 256)}::${text.length}`;

// In-memory blob URL cache for current session
const audioCache = new Map<string, string>();

export const TTSProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(LS_ENABLED);
    return v == null ? true : v === "1";
  });
  const [speed, setSpeedState] = useState<SpeedOption>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(localStorage.getItem(LS_SPEED) || "1");
    return (v === 0.85 || v === 1.15 ? v : 1) as SpeedOption;
  });
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(localStorage.getItem(LS_VOLUME) || "1");
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  });

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lazy create single Audio element
  const getAudio = () => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "auto";
      a.onended = () => {
        setPlayingId(null);
        setActiveAgentId(null);
      };
      a.onerror = () => {
        setPlayingId(null);
        setLoadingId(null);
        setActiveAgentId(null);
      };
      audioRef.current = a;
    }
    audioRef.current.volume = volume;
    return audioRef.current;
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const setEnabled = (v: boolean) => {
    localStorage.setItem(LS_ENABLED, v ? "1" : "0");
    setEnabledState(v);
    if (!v && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      setActiveAgentId(null);
    }
  };
  const setSpeed = (v: SpeedOption) => {
    localStorage.setItem(LS_SPEED, String(v));
    setSpeedState(v);
  };
  const setVolume = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    localStorage.setItem(LS_VOLUME, String(clamped));
    setVolumeState(clamped);
  };

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    setActiveAgentId(null);
  }, []);

  const play = useCallback(
    async ({ messageId, agentId, text }: { messageId: string; agentId: string; text: string }) => {
      if (!enabled) return;
      const audio = getAudio();

      // Toggle: clicking the currently-playing message → stop
      if (playingId === messageId) {
        stop();
        return;
      }

      // Always stop previous before starting new
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);

      const key = cacheKey(agentId, text, speed);
      const cached = audioCache.get(key);

      const start = async (src: string) => {
        audio.src = src;
        audio.volume = volume;
        try {
          await audio.play();
          setPlayingId(messageId);
          setActiveAgentId(agentId);
        } catch (err) {
          console.error("[TTS] audio.play failed", err);
          toast.error("无法播放语音，请检查浏览器音量或重试");
        }
      };

      if (cached) {
        await start(cached);
        return;
      }

      setLoadingId(messageId);
      setActiveAgentId(agentId);
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const token = sessionRes.session?.access_token;
        if (!token) {
          toast.error("请先登录后再使用语音播放");
          return;
        }
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-speak`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ agentId, text, speed }),
        });
        if (!resp.ok) {
          const errJson = await resp.json().catch(() => ({}));
          throw new Error(errJson?.error || `语音请求失败 (${resp.status})`);
        }
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        audioCache.set(key, blobUrl);
        await start(blobUrl);
      } catch (e: any) {
        console.error("[TTS] fetch failed", e);
        toast.error(e?.message || "语音生成失败");
        setActiveAgentId(null);
      } finally {
        setLoadingId(null);
      }
    },
    [enabled, playingId, speed, volume, stop],
  );

  const value = useMemo<TTSContextValue>(
    () => ({ enabled, setEnabled, volume, setVolume, speed, setSpeed, loadingId, playingId, activeAgentId, play, stop }),
    [enabled, volume, speed, loadingId, playingId, activeAgentId, play, stop],
  );

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
};

export const useTTS = () => {
  const ctx = useContext(TTSContext);
  if (!ctx) throw new Error("useTTS must be used within TTSProvider");
  return ctx;
};
