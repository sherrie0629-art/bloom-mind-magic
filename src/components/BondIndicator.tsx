import { BOND_LABELS, BOND_THRESHOLDS } from "@/data/agents";

interface BondIndicatorProps {
  level: number;
  totalTurns: number;
  energyBits?: number;
}

const BondIndicator = ({ level, totalTurns }: BondIndicatorProps) => {
  const label = BOND_LABELS[level - 1] || "Stranger";
  const nextThreshold = BOND_THRESHOLDS[level] || null;
  const currentThreshold = BOND_THRESHOLDS[level - 1] || 0;
  
  const progress = nextThreshold
    ? ((totalTurns - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`text-[10px] ${i <= level ? "opacity-100" : "opacity-20"}`}>
            ⭐
          </span>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {nextThreshold && (
        <div className="h-1 w-8 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default BondIndicator;
