import { Lock } from "lucide-react";
import { Agent, BOND_LABELS, BOND_THRESHOLDS } from "@/data/agents";
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
  open: boolean;
  onClose: () => void;
}

const AgentProfileDrawer = ({
  agent,
  bondLevel,
  totalTurns,
  open,
  onClose,
}: AgentProfileDrawerProps) => {
  const nextThreshold = BOND_THRESHOLDS[bondLevel] ?? BOND_THRESHOLDS[BOND_THRESHOLDS.length - 1];
  const prevThreshold = BOND_THRESHOLDS[bondLevel - 1] ?? 0;
  const progressPct =
    bondLevel >= BOND_LABELS.length
      ? 100
      : Math.min(100, ((totalTurns - prevThreshold) / (nextThreshold - prevThreshold)) * 100);

  const nextLockedLore = agent.lore.find((l) => l.level > bondLevel);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="p-0">
          {/* Gradient header area */}
          <div
            className={`${agent.gradient} flex flex-col items-center gap-3 rounded-t-[10px] px-6 pt-6 pb-5`}
          >
            <img
              src={agent.image}
              alt={agent.name}
              className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg"
            />
            <div className="text-center">
              <DrawerTitle className="text-lg font-bold text-white drop-shadow">
                {agent.name}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-white/80 mt-0.5">
                {agent.title}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-5 pb-6 space-y-5">
          {/* Quote */}
          <p className="text-center text-sm italic text-muted-foreground mt-4 leading-relaxed">
            "{agent.quote}"
          </p>

          {/* Description */}
          <p className="text-sm text-foreground/80 text-center leading-relaxed">
            {agent.description}
          </p>

          {/* Bond level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Bond: <span className="text-secondary">{BOND_LABELS[bondLevel - 1]}</span>
              </span>
              <span className="text-muted-foreground">
                Lv.{bondLevel} · {totalTurns} turns
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {/* Lore entries */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Story Fragments
            </h3>
            {agent.lore.map((entry) => {
              const unlocked = entry.level <= bondLevel;
              return (
                <div
                  key={entry.level}
                  className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed transition-colors ${
                    unlocked
                      ? "bg-secondary/5 text-foreground/80 border border-secondary/10"
                      : "bg-muted/40 text-muted-foreground/50"
                  }`}
                >
                  {unlocked ? (
                    entry.text
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3" />
                      Deepen your bond to unlock
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Suspense hook */}
          {nextLockedLore && (
            <p className="text-center text-[11px] text-muted-foreground/60 italic">
              There's a secret {agent.name} has never told anyone…
            </p>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            Continue Chatting
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AgentProfileDrawer;
