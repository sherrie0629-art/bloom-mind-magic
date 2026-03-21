import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBondLevel } from "@/data/agents";

interface BondState {
  bondLevel: number;
  totalTurns: number;
  easterEggsFound: string[];
}

export function useBond(userId: string | undefined, agentId: string) {
  const [bond, setBond] = useState<BondState>({ bondLevel: 1, totalTurns: 0, easterEggsFound: [] });
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);

  // Load or create bond record
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from("agent_bonds")
        .select("*")
        .eq("user_id", userId)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (data) {
        setBond({
          bondLevel: data.bond_level,
          totalTurns: data.total_turns,
          easterEggsFound: (data.easter_eggs_found as string[]) || [],
        });
      } else {
        // Create initial bond
        await supabase.from("agent_bonds").insert({
          user_id: userId,
          agent_id: agentId,
          bond_level: 1,
          total_turns: 0,
        });
      }
    };
    load();
  }, [userId, agentId]);

  const incrementTurn = useCallback(async () => {
    if (!userId) return;
    const newTurns = bond.totalTurns + 1;
    const newLevel = getBondLevel(newTurns);
    const leveledUp = newLevel > bond.bondLevel;

    setBond((prev) => ({ ...prev, totalTurns: newTurns, bondLevel: newLevel }));

    if (leveledUp) {
      setPendingLevelUp(newLevel);
    }

    await supabase
      .from("agent_bonds")
      .update({ total_turns: newTurns, bond_level: newLevel, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("agent_id", agentId);
  }, [userId, agentId, bond.totalTurns, bond.bondLevel]);

  const recordEasterEgg = useCallback(async (trigger: string) => {
    if (!userId || bond.easterEggsFound.includes(trigger)) return;
    const updated = [...bond.easterEggsFound, trigger];
    setBond((prev) => ({ ...prev, easterEggsFound: updated }));

    await supabase
      .from("agent_bonds")
      .update({ easter_eggs_found: updated as any })
      .eq("user_id", userId)
      .eq("agent_id", agentId);
  }, [userId, agentId, bond.easterEggsFound]);

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), []);

  return { ...bond, pendingLevelUp, incrementTurn, recordEasterEgg, dismissLevelUp };
}
