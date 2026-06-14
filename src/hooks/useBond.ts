import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getBondLevel, DAILY_BOND_TURN_CAP } from "@/data/agents";

interface BondState {
  bondLevel: number;
  totalTurns: number;
  easterEggsFound: string[];
  turnsToday: number;
  lastTurnDate: string | null;
}

function todayStr() {
  // 用本地日期，避免跨时区导致重置失败
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useBond(userId: string | undefined, agentId: string) {
  const [bond, setBond] = useState<BondState>({
    bondLevel: 1,
    totalTurns: 0,
    easterEggsFound: [],
    turnsToday: 0,
    lastTurnDate: null,
  });
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  // 当日额度耗尽时只提示一次
  const dailyCapToastedRef = useRef(false);

  // Load or create bond record
  useEffect(() => {
    if (!userId) return;
    dailyCapToastedRef.current = false;
    const load = async () => {
      const { data } = await supabase
        .from("agent_bonds")
        .select("*")
        .eq("user_id", userId)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (data) {
        const last = (data as any).last_turn_date as string | null;
        const today = todayStr();
        // 跨天则今日计数已实际为 0（不写库，下次推进时再刷）
        const turnsToday = last === today ? ((data as any).turns_today ?? 0) : 0;
        setBond({
          bondLevel: data.bond_level,
          totalTurns: data.total_turns,
          easterEggsFound: (data.easter_eggs_found as string[]) || [],
          turnsToday,
          lastTurnDate: last,
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
    const today = todayStr();
    const sameDay = bond.lastTurnDate === today;
    const turnsToday = sameDay ? bond.turnsToday : 0;

    // 当日已达上限：保留聊天，但不再推进羁绊进度
    if (turnsToday >= DAILY_BOND_TURN_CAP) {
      if (!dailyCapToastedRef.current) {
        dailyCapToastedRef.current = true;
        const isZh = (i18n.resolvedLanguage || i18n.language || "").startsWith("zh");
        toast.info(isZh ? "今天的羁绊已加满，明天再来 ✨" : "Today's bond is full. Come back tomorrow ✨");
      }
      return;
    }

    const newTurns = bond.totalTurns + 1;
    const newLevel = getBondLevel(newTurns);
    const leveledUp = newLevel > bond.bondLevel;
    const newTurnsToday = turnsToday + 1;

    setBond((prev) => ({
      ...prev,
      totalTurns: newTurns,
      bondLevel: newLevel,
      turnsToday: newTurnsToday,
      lastTurnDate: today,
    }));

    if (leveledUp) setPendingLevelUp(newLevel);

    await supabase
      .from("agent_bonds")
      .update({
        total_turns: newTurns,
        bond_level: newLevel,
        turns_today: newTurnsToday,
        last_turn_date: today,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", userId)
      .eq("agent_id", agentId);
  }, [userId, agentId, bond.totalTurns, bond.bondLevel, bond.turnsToday, bond.lastTurnDate]);

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
