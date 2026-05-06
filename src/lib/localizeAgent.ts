import type { TFunction } from "i18next";
import type { Agent } from "@/data/agents";

const safeTrigger = (s: string) => s.replace(/[^a-zA-Z0-9_]+/g, "_");

export function localizeAgent(agent: Agent, t: TFunction): Agent {
  const base = `agents.${agent.id}`;
  const tx = (key: string, fallback: string) =>
    t(`${base}.${key}`, { defaultValue: fallback });

  const loreArr = t(`${base}.lore`, { returnObjects: true, defaultValue: null }) as
    | string[]
    | null;

  const lore = agent.lore.map((entry, i) => ({
    level: entry.level,
    text: Array.isArray(loreArr) && typeof loreArr[i] === "string" ? loreArr[i] : entry.text,
  }));

  const easterEggs = agent.easterEggs.map((egg) => ({
    trigger: egg.trigger,
    response: t(`${base}.eggs.${safeTrigger(egg.trigger)}`, { defaultValue: egg.response }),
  }));

  return {
    ...agent,
    title: tx("title", agent.title),
    description: tx("description", agent.description),
    quote: tx("quote", agent.quote),
    lore,
    easterEggs,
  };
}

export function getAgentWelcome(agent: Agent, t: TFunction): string {
  return t(`agents.${agent.id}.welcome`, {
    name: agent.name,
    defaultValue: `Hey! I'm ${agent.name}, ${agent.description}. What's on your mind? 😊`,
  });
}

export function getAgentQuickReplies(agent: Agent, t: TFunction): string[] {
  const arr = t(`agents.${agent.id}.quickReplies`, {
    returnObjects: true,
    defaultValue: null,
  }) as string[] | null;
  return Array.isArray(arr) ? arr : [];
}
