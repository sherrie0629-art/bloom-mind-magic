import { createLovableClient } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

export const lovable = createLovableClient({
  supabaseClient: supabase,
  projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
});
