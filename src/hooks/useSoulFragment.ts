import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import i18n from "@/i18n";

export async function generateSoulFragment(
  userId: string,
  sourceType: "assessment" | "chat",
  sourceId: string,
  context: string
) {
  try {
    const locale = (i18n.resolvedLanguage || i18n.language || "en").startsWith("zh") ? "zh" : "en";
    const { data, error } = await supabase.functions.invoke("generate-soul-fragment", {
      body: { type: sourceType, context, sourceId, locale },
    });
    if (error || !data?.name) return;

    await (supabase as any).from("soul_fragments").insert({
      user_id: userId,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      source_type: sourceType,
      source_id: sourceId,
    });

    toast.success(i18n.t("soulFragment.newToast", { name: data.name, defaultValue: `✨ New Soul Fragment: ${data.name}` }));
  } catch (e) {
    console.error("Soul fragment generation failed:", e);
  }
}
