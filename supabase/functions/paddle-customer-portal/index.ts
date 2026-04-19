import { createClient } from "npm:@supabase/supabase-js@2";
import { getPaddleClient, type PaddleEnv } from "../_shared/paddle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    // Look up subscription with service role (bypasses RLS, but we filter by user_id)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: sub, error: subErr } = await admin
      .from("user_subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      console.error("subscription lookup error:", subErr);
      return new Response(JSON.stringify({ error: "Subscription lookup failed" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    if (!sub?.paddle_customer_id) {
      return new Response(
        JSON.stringify({ error: "No active subscription found for this account." }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const env = ((sub.environment as PaddleEnv) || "sandbox") as PaddleEnv;
    const paddle = getPaddleClient(env);

    const subscriptionIds = sub.paddle_subscription_id ? [sub.paddle_subscription_id] : [];
    const portalSession = await paddle.customerPortalSessions.create(
      sub.paddle_customer_id,
      subscriptionIds
    );

    const overviewUrl = (portalSession as any)?.urls?.general?.overview;
    if (!overviewUrl) {
      console.error("No overview URL in portal session", portalSession);
      return new Response(JSON.stringify({ error: "Portal session missing URL" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ url: overviewUrl }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("paddle-customer-portal error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
