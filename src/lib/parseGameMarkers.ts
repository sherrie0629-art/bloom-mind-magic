// Parse RPG-Therapy game markers from AI responses

export interface BranchOption {
  text: string;
  emotion: string;
}

export type Atmosphere = "snow" | "rain" | "starry" | "warm" | "sakura" | "storm" | null;

export interface GameMarkers {
  cleanContent: string;
  energyGain: number | null;
  branchOptions: BranchOption[] | null;
  truthShard: { title: string; description: string } | null;
  atmosphere: Atmosphere;
}

// More flexible regexes to handle variations from different AI models
// Allow optional spaces, full/half-width brackets, etc.
const ENERGY_RE = /[【\[]⚡\s*能量\s*[+＋]\s*(\d+)\s*[】\]]/;
const OPTIONS_RE = /[【\[]💫\s*选项\s*[】\]](.+)/;
const SHARD_RE = /[【\[]🔮\s*真相碎片\s*[】\]]\s*([^|｜]+)[|｜](.+)/;
const EMOTION_RE = /[{｛]([^}｝]+)[}｝]\s*$/;
const ATMOSPHERE_RE = /[【\[]🎭\s*氛围\s*[:：]\s*(\w+)\s*[】\]]/;

// Fallback: try to detect option-like patterns without exact markers
const FALLBACK_OPTIONS_RE = /(?:选项|选择)[：:]\s*(.+)/;

const VALID_ATMOSPHERES = new Set(["snow", "rain", "starry", "warm", "sakura", "storm"]);
const VALID_EMOTIONS = new Set(["勇敢", "温柔", "理性", "叛逆", "好奇", "悲伤", "希望", "愤怒"]);

function parseOptions(raw: string): BranchOption[] {
  return raw
    .split(/[|｜]/)
    .map((o) => {
      const cleaned = o.replace(/^[A-Ca-c][.．:：]\s*/, "").trim();
      const emotionMatch = cleaned.match(/[{｛]([^}｝]+)[}｝]\s*$/);
      if (emotionMatch && VALID_EMOTIONS.has(emotionMatch[1])) {
        return {
          text: cleaned.replace(/[{｛][^}｝]+[}｝]\s*$/, "").trim(),
          emotion: emotionMatch[1],
        };
      }
      return { text: cleaned, emotion: "好奇" };
    })
    .filter((o) => o.text.length > 0);
}

export function parseGameMarkers(content: string): GameMarkers {
  let cleanContent = content;
  let energyGain: number | null = null;
  let branchOptions: BranchOption[] | null = null;
  let truthShard: { title: string; description: string } | null = null;
  let atmosphere: Atmosphere = null;

  // Extract energy
  const energyMatch = cleanContent.match(ENERGY_RE);
  if (energyMatch) {
    energyGain = parseInt(energyMatch[1], 10);
    cleanContent = cleanContent.replace(ENERGY_RE, "").trim();
  }

  // Extract branch options with emotion tags
  const optionsMatch = cleanContent.match(OPTIONS_RE);
  if (optionsMatch) {
    branchOptions = parseOptions(optionsMatch[1]);
    cleanContent = cleanContent.replace(OPTIONS_RE, "").trim();
  } else {
    // Fallback: try looser pattern
    const fallbackMatch = cleanContent.match(FALLBACK_OPTIONS_RE);
    if (fallbackMatch) {
      const parsed = parseOptions(fallbackMatch[1]);
      if (parsed.length >= 2) {
        branchOptions = parsed;
        cleanContent = cleanContent.replace(FALLBACK_OPTIONS_RE, "").trim();
      }
    }
  }

  // Extract truth shard
  const shardMatch = cleanContent.match(SHARD_RE);
  if (shardMatch) {
    truthShard = { title: shardMatch[1].trim(), description: shardMatch[2].trim() };
    cleanContent = cleanContent.replace(SHARD_RE, "").trim();
  }

  // Extract atmosphere
  const atmosphereMatch = cleanContent.match(ATMOSPHERE_RE);
  if (atmosphereMatch && VALID_ATMOSPHERES.has(atmosphereMatch[1])) {
    atmosphere = atmosphereMatch[1] as Atmosphere;
    cleanContent = cleanContent.replace(ATMOSPHERE_RE, "").trim();
  }

  // Debug: log when markers are found
  if (branchOptions || energyGain || truthShard || atmosphere) {
    console.log("[parseGameMarkers] found:", {
      energyGain,
      branchOptions: branchOptions?.length,
      truthShard: !!truthShard,
      atmosphere,
    });
  }

  return { cleanContent, energyGain, branchOptions, truthShard, atmosphere };
}
