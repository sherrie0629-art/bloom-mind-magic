import { Volume2, Loader2 } from "lucide-react";
import { useTTS } from "@/contexts/TTSContext";
import { motion } from "framer-motion";

interface Props {
  messageId: string;
  agentId: string;
  text: string;
  /** disable when message is still streaming */
  disabled?: boolean;
}

const MessageVoiceButton = ({ messageId, agentId, text, disabled }: Props) => {
  const { play, loadingId, playingId, enabled } = useTTS();
  if (!enabled) return null;

  const isLoading = loadingId === messageId;
  const isPlaying = playingId === messageId;

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isLoading) return;
    void play({ messageId, agentId, text });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={isPlaying ? "暂停语音" : "播放语音"}
      title={isPlaying ? "暂停语音" : "播放语音"}
      className={`mt-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors active:scale-90 ${
        isPlaying
          ? "text-secondary bg-secondary/10 hover:bg-secondary/20"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPlaying ? (
        <span className="flex items-end gap-[2px] h-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-[2px] rounded-full bg-secondary"
              animate={{ height: ["30%", "100%", "30%"] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </span>
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

export default MessageVoiceButton;
