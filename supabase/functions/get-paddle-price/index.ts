import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const responseHeaders = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Content-Type": "application/json",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, responseHeaders);
  }

  try {
    // Require signed-in caller to prevent unauthenticated Paddle API consumption
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (!token || token === Deno.env.get("SUPABASE_ANON_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, ...responseHeaders });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, ...responseHeaders });
    }

    const { priceId, environment } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({ error: "priceId required" }), {
        status: 400,
        ...responseHeaders,
      });
    }

    const env = (environment === "live" ? "live" : "sandbox") as PaddleEnv;
    const response = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await response.json();

    if (!data.data?.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        ...responseHeaders,
      });
    }

    return new Response(JSON.stringify({ paddleId: data.data[0].id }), responseHeaders);
  } catch (e) {
    console.error("get-paddle-price error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      ...responseHeaders,
    });
  }
});
