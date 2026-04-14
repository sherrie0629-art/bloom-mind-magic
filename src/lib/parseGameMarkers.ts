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

const ENERGY_RE = /[【\[]⚡\s*Energy\s*[+＋]\s*(\d+)\s*[】\]]/i;
const OPTIONS_RE = /[【\[]💫\s*Options\s*[】\]](.+)/i;
const SHARD_RE = /[【\[]🔮\s*Truth\s*Shard\s*[】\]]\s*([^|｜]+)[|｜](.+)/i;
const ATMOSPHERE_RE = /[【\[]🎭\s*Mood\s*[:：]\s*(\w+)\s*[】\]]/i;

const FALLBACK_OPTIONS_RE = /(?:Options|Choices)[：:]\s*(.+)/i;

const VALID_ATMOSPHERES = new Set(["snow", "rain", "starry", "warm", "sakura", "storm"]);
const VALID_EMOTIONS = new Set(["brave", "gentle", "rational", "rebellious", "curious", "sad", "hopeful", "angry"]);

function parseOptions(raw: string): BranchOption[] {
  return raw
    .split(/[|｜]/)
    .map((o) => {
      const cleaned = o.replace(/^[A-Ca-c][.．:：]\s*/, "").trim();
      const emotionMatch = cleaned.match(/[{｛]([^}｝]+)[}｝]\s*$/);
      if (emotionMatch && VALID_EMOTIONS.has(emotionMatch[1].toLowerCase())) {
        return {
          text: cleaned.replace(/[{｛][^}｝]+[}｝]\s*$/, "").trim(),
          emotion: emotionMatch[1].toLowerCase(),
        };
      }
      return { text: cleaned, emotion: "curious" };
    })
    .filter((o) => o.text.length > 0);
}

export function parseGameMarkers(content: string): GameMarkers {
  let cleanContent = content;
  let energyGain: number | null = null;
  let branchOptions: BranchOption[] | null = null;
  let truthShard: { title: string; description: string } | null = null;
  let atmosphere: Atmosphere = null;

  const energyMatch = cleanContent.match(ENERGY_RE);
  if (energyMatch) {
    energyGain = parseInt(energyMatch[1], 10);
    cleanContent = cleanContent.replace(ENERGY_RE, "").trim();
  }

  const optionsMatch = cleanContent.match(OPTIONS_RE);
  if (optionsMatch) {
    branchOptions = parseOptions(optionsMatch[1]);
    cleanContent = cleanContent.replace(OPTIONS_RE, "").trim();
  } else {
    const fallbackMatch = cleanContent.match(FALLBACK_OPTIONS_RE);
    if (fallbackMatch) {
      const parsed = parseOptions(fallbackMatch[1]);
      if (parsed.length >= 2) {
        branchOptions = parsed;
        cleanContent = cleanContent.replace(FALLBACK_OPTIONS_RE, "").trim();
      }
    }
  }

  const shardMatch = cleanContent.match(SHARD_RE);
  if (shardMatch) {
    truthShard = { title: shardMatch[1].trim(), description: shardMatch[2].trim() };
    cleanContent = cleanContent.replace(SHARD_RE, "").trim();
  }

  const atmosphereMatch = cleanContent.match(ATMOSPHERE_RE);
  if (atmosphereMatch && VALID_ATMOSPHERES.has(atmosphereMatch[1])) {
    atmosphere = atmosphereMatch[1] as Atmosphere;
    cleanContent = cleanContent.replace(ATMOSPHERE_RE, "").trim();
  }

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
