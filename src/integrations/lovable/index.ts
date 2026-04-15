import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const lovableAuth = createLovableAuth();

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: { redirect_uri?: string; extraParams?: Record<string, string> }) => {
      const result = await lovableAuth.signInWithOAuth(provider, opts);
      // If tokens received, set session on supabase client
      if (result.tokens && !result.error) {
        await supabase.auth.setSession({
          access_token: result.tokens.access_token,
          refresh_token: result.tokens.refresh_token,
        });
      }
      return result;
    },
  },
};
