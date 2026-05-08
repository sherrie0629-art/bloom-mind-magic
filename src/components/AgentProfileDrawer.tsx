import { Lock, Gem, Sparkles, ArrowRight, Zap, Briefcase, MapPin, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Agent, BOND_LABELS, BOND_THRESHOLDS } from "@/data/agents";
import { localizeAgent } from "@/lib/localizeAgent";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";

interface AgentProfileDrawerProps {
  agent: Agent;
  bondLevel: number;
  totalTurns: number;
  easterEggsFound?: string[];
  open: boolean;
  onClose: () => void;
}

const REVERSAL_LEVEL = 4;

const AgentProfileDrawer = ({
  agent: rawAgent,
  bondLevel,
  totalTurns,
  easterEggsFound = [],
  open,
  onClose,
}: AgentProfileDrawerProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const agent = localizeAgent(rawAgent, t);
  const nextThreshold = BOND_THRESHOLDS[bondLevel] ?? BOND_THRESHOLDS[BOND_THRESHOLDS.length - 1];
  const prevThreshold = BOND_THRESHOLDS[bondLevel - 1] ?? 0;
  const progressPct =
    bondLevel >= BOND_LABELS.length
      ? 100
      : Math.min(100, ((totalTurns - prevThreshold) / (nextThreshold - prevThreshold)) * 100);

  const info = (t(`agentDrawer.info.${agent.id}`, { returnObjects: true }) as Record<string, string>) || {};
  const shardHints = (t(`agentDrawer.shardHints.${agent.id}`, { returnObjects: true }) as string[]) || [];
  const related = (t(`agentDrawer.related.${agent.id}`, { returnObjects: true }) as string[]) || [];
  const currentMoment = t(`agentDrawer.currentMoment.${agent.id}`, "");

  const shardsCount = agent.easterEggs.filter((e) => easterEggsFound.includes(e.trigger)).length;
  const shardsTotal = agent.easterEggs.length;
  const shardsComplete = shardsCount === shardsTotal && shardsTotal > 0;

  // Pick a try-asking phrase = first locked shard hint
  const lockedHintIdx = agent.easterEggs.findIndex((e) => !easterEggsFound.includes(e.trigger));
  const tryPhrase = lockedHintIdx >= 0 ? shardHints[lockedHintIdx] : null;

  const handleViewArchive = () => {
    onClose();
    navigate("/archive", { state: { agentId: agent.id } });
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="p-0">
          <div className={`${agent.gradient} relative overflow-hidden rounded-t-[10px] px-6 pt-6 pb-5`}>
            {/* subtle ambient blobs */}
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-3">
              <div className={`relative ${shardsComplete ? "ring-2 ring-gold ring-offset-2 ring-offset-transparent rounded-2xl" : ""}`}>
                <img
                  src={agent.image}
                  alt={agent.name}
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg"
                />
                {shardsComplete && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold shadow-lg">
                    <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                  </span>
                )}
              </div>
              <div className="text-center">
                <DrawerTitle className="text-lg font-bold text-white drop-shadow">{agent.name}</DrawerTitle>
                <DrawerDescription className="text-xs text-white/80 mt-0.5">{agent.title}</DrawerDescription>
              </div>
              {currentMoment && (
                <div className="mt-1 rounded-full bg-black/20 backdrop-blur-sm px-3 py-1.5 text-[11px] text-white/95 font-medium">
                  {currentMoment}
                </div>
              )}
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-5 pb-6 space-y-5">
          {/* Quote */}
          <p className="text-center text-sm italic text-muted-foreground mt-4 leading-relaxed">"{agent.quote}"</p>

          {/* Identity badges */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Briefcase, label: t("agentDrawer.identity"), value: info.identity },
              { icon: MapPin, label: t("agentDrawer.location"), value: info.location },
              { icon: Heart, label: t("agentDrawer.token"), value: info.token },
            ].map((b, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/50 p-2.5 text-center">
                <b.icon className="mx-auto h-3.5 w-3.5 text-secondary mb-1" />
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">{b.label}</p>
                <p className="mt-0.5 text-[11px] font-medium text-foreground leading-tight">{b.value}</p>
              </div>
            ))}
          </div>

          {/* Bond level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {t("agentDrawer.bondPrefix")}
                <span className="text-secondary">
                  {t(`home.bondLabels.${(["stranger","acquaintance","trusted","close","soulbound"][bondLevel - 1]) || "stranger"}`)}
                </span>
              </span>
              <span className="text-muted-foreground">{t("agentDrawer.lvTurns", { lv: bondLevel, n: totalTurns })}</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {/* Lore timeline */}
          <div>
            <h3 className="mb-2.5 text-xs font-semibold text-foreground uppercase tracking-wider">
              {t("agentDrawer.storyFragments")}
            </h3>
            <div className="relative pl-5 space-y-2.5">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" aria-hidden />
              {agent.lore.map((entry) => {
                const unlocked = entry.level <= bondLevel;
                const isReversal = entry.level === REVERSAL_LEVEL;
                const threshold = BOND_THRESHOLDS[entry.level - 1] ?? 0;
                return (
                  <div key={entry.level} className="relative">
                    <span
                      className={`absolute -left-[18px] top-2 h-2.5 w-2.5 rounded-full border-2 ${
                        unlocked
                          ? isReversal
                            ? "bg-gold border-gold shadow-glow"
                            : "bg-secondary border-secondary"
                          : "bg-muted border-border"
                      }`}
                    />
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        unlocked
                          ? isReversal
                            ? "bg-gradient-to-br from-gold/15 to-secondary/5 border border-gold/40"
                            : "bg-secondary/5 text-foreground/85 border border-secondary/15"
                          : "bg-muted/40 text-muted-foreground/60 border border-border"
                      }`}
                    >
                      {isReversal && unlocked && (
                        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                          <Zap className="h-2.5 w-2.5" /> {t("agentDrawer.lvReversal")}
                        </span>
                      )}
                      {unlocked ? (
                        <p>{entry.text}</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="italic">{t("agentDrawer.lockedPreview")}</p>
                          <p className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                            <Lock className="h-2.5 w-2.5" /> {t("agentDrawer.lvUnlocksAt", { n: threshold })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Truth shards */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Gem className="h-3.5 w-3.5 text-gold" /> {t("agentDrawer.shardsTitle")}
              </h3>
              <span className={`text-[11px] font-semibold ${shardsComplete ? "text-gold" : "text-muted-foreground"}`}>
                {t("agentDrawer.shardsProgress", { cur: shardsCount, total: shardsTotal })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {agent.easterEggs.map((egg, i) => {
                const isUnlocked = easterEggsFound.includes(egg.trigger);
                return (
                  <div
                    key={egg.trigger}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 text-center overflow-hidden ${
                      isUnlocked
                        ? "bg-gradient-to-br from-gold/30 to-secondary/20 border border-gold/50 shadow-glow"
                        : "bg-muted/40 border border-border/50"
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        <Gem className="h-5 w-5 text-gold mb-1" />
                        <span className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">
                          "{egg.trigger}"
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/60 mb-1" />
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                          {t("agentDrawer.shardHintLabel")}
                        </span>
                        <span className="mt-0.5 text-[10px] text-muted-foreground/80 leading-tight line-clamp-2">
                          {shardHints[i] || "???"}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {shardsComplete && (
              <p className="mt-2 text-center text-[11px] text-gold font-medium">{t("agentDrawer.shardComplete")}</p>
            )}
          </div>

          {/* Universe */}
          <div className="rounded-xl border border-dashed border-secondary/40 bg-card/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              <h3 className="text-xs font-semibold text-foreground">{t("agentDrawer.universeTitle")}</h3>
            </div>
            {related.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {t("agentDrawer.universeKnows")}{" "}
                {related.map((n, i) => (
                  <span key={n}>
                    <span className="font-medium text-secondary">{n}</span>
                    {i < related.length - 1 ? "、" : ""}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/70">{t("agentDrawer.universeLocked")}</p>
            )}
          </div>

          {/* Try-asking pill */}
          {tryPhrase && (
            <div className="rounded-2xl bg-gradient-to-r from-secondary/10 to-gold/10 border border-secondary/20 px-3.5 py-2.5">
              <p className="text-[11px] text-foreground/80">
                <span className="mr-1">💬</span>
                {t("agentDrawer.tryAsking", { phrase: tryPhrase })}
              </p>
            </div>
          )}

          {/* Dual CTA */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleViewArchive}
              className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
            >
              {t("agentDrawer.viewArchive")}
            </button>
            <button
              onClick={onClose}
              className="flex-[1.4] rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
            >
              {t("agentDrawer.continueChat")} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AgentProfileDrawer;
