import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, type AchievementDef } from "@/data/achievements";

interface AgentBondRow {
  agent_id: string;
  bond_level: number;
  total_turns: number;
  energy_bits: number;
  easter_eggs_found: string[];
}

export function useAchievements(userId: string | undefined) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDef | null>(null);
  const checkedRef = useRef(false);

  // Load existing achievements
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("achievements")
      .select("achievement_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setUnlockedIds(data.map((r) => r.achievement_id));
      });
  }, [userId]);

  const checkAchievements = useCallback(async () => {
    if (!userId) return;

    // Gather stats
    const [bondsRes, shardsRes, convsRes] = await Promise.all([
      supabase.from("agent_bonds").select("agent_id, bond_level, total_turns, energy_bits, easter_eggs_found").eq("user_id", userId),
      (supabase as any).from("story_vault").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("type", "truth_shard"),
      supabase.from("conversations").select("agent_id").eq("user_id", userId),
    ]);

    const bonds: AgentBondRow[] = (bondsRes.data || []).map((b: any) => ({
      ...b,
      easter_eggs_found: (b.easter_eggs_found as string[]) || [],
    }));

    const totalShards = shardsRes.count || 0;
    const uniqueAgents = new Set((convsRes.data || []).map((c: any) => c.agent_id)).size;
    const totalEnergy = bonds.reduce((s, b) => s + b.energy_bits, 0);
    const totalEggs = bonds.reduce((s, b) => s + b.easter_eggs_found.length, 0);

    // Reload current unlocked to avoid race
    const { data: currentAch } = await supabase.from("achievements").select("achievement_id").eq("user_id", userId);
    const alreadyUnlocked = new Set((currentAch || []).map((a) => a.achievement_id));

    for (const ach of ACHIEVEMENTS) {
      if (alreadyUnlocked.has(ach.id)) continue;

      let met = false;
      const c = ach.condition;

      if (c.agentId) {
        const bond = bonds.find((b) => b.agent_id === c.agentId);
        if (!bond) continue;
        if (c.type === "total_turns") met = bond.total_turns >= c.threshold;
        else if (c.type === "energy_bits") met = bond.energy_bits >= c.threshold;
        else if (c.type === "bond_level") met = bond.bond_level >= c.threshold;
        else if (c.type === "easter_eggs") met = bond.easter_eggs_found.length >= c.threshold;
      } else {
        if (c.type === "total_conversations") met = uniqueAgents >= c.threshold;
        else if (c.type === "energy_bits") met = totalEnergy >= c.threshold;
        else if (c.type === "truth_shards") met = totalShards >= c.threshold;
        else if (c.type === "easter_eggs") met = totalEggs >= c.threshold;
      }

      if (met) {
        const { data: granted } = await (supabase as any).rpc("grant_achievement", { p_achievement_id: ach.id });
        if (granted) {
          alreadyUnlocked.add(ach.id);
          setUnlockedIds((prev) => [...prev, ach.id]);
          setNewlyUnlocked(ach);
          break; // show one at a time
        }
      }
    }
  }, [userId]);

  const dismissAchievement = useCallback(() => setNewlyUnlocked(null), []);

  return { unlockedIds, newlyUnlocked, checkAchievements, dismissAchievement };
}
