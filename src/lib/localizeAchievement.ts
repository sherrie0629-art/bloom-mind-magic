import type { TFunction } from "i18next";
import type { AchievementDef } from "@/data/achievements";

export function localizeAchievement(ach: AchievementDef, t: TFunction) {
  return {
    name: t(`achievements.items.${ach.id}.name`, { defaultValue: ach.name }),
    description: t(`achievements.items.${ach.id}.description`, { defaultValue: ach.description }),
    constellationName: t(`achievements.items.${ach.id}.constellation`, {
      defaultValue: ach.constellation.name,
    }),
  };
}
