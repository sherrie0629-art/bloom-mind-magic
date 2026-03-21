import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function generateSoulFragment(
  userId: string,
  sourceType: "assessment" | "chat",
  sourceId: string,
  context: string
) {
  try {
    const { data, error } = await supabase.functions.invoke("generate-soul-fragment", {
      body: { type: sourceType, context, sourceId },
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

    toast.success(`✨ 获得新的灵魂碎片：${data.name}`);
  } catch (e) {
    console.error("Soul fragment generation failed:", e);
  }
}
