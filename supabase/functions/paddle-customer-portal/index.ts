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
      .select("paddle_customer_id, paddle_subscription_id, environment, plan, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      console.error("subscription lookup error:", subErr);
      return new Response(JSON.stringify({ error: "Subscription lookup failed" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const isActive =
      sub?.plan === "plus" && sub?.expires_at && new Date(sub.expires_at) > new Date();

    if (!sub || !isActive) {
      return new Response(
        JSON.stringify({ error: "No active subscription found for this account." }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Determine environment: prefer stored value, otherwise try sandbox first then live.
    const envCandidates: PaddleEnv[] = sub.environment
      ? [sub.environment as PaddleEnv]
      : ["sandbox", "live"];

    let resolvedCustomerId = sub.paddle_customer_id as string | null;
    let resolvedSubscriptionId = sub.paddle_subscription_id as string | null;
    let resolvedEnv: PaddleEnv = (sub.environment as PaddleEnv) || "sandbox";

    // Backfill: subscription was created before we tracked Paddle IDs. Look up by email.
    if (!resolvedCustomerId && user.email) {
      for (const candidate of envCandidates) {
        try {
          const custRes = await fetch(
            `https://connector-gateway.lovable.dev/paddle/customers?email=${encodeURIComponent(user.email)}`,
            {
              headers: {
                "X-Connection-Api-Key":
                  candidate === "sandbox"
                    ? Deno.env.get("PADDLE_SANDBOX_API_KEY")!
                    : Deno.env.get("PADDLE_LIVE_API_KEY")!,
                "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
              },
            }
          );
          const custJson = await custRes.json();
          const customer = custJson?.data?.[0];
          if (!customer?.id) continue;

          resolvedCustomerId = customer.id;
          resolvedEnv = candidate;

          // Also try to find the active subscription for this customer
          const subRes = await fetch(
            `https://connector-gateway.lovable.dev/paddle/subscriptions?customer_id=${customer.id}&status=active`,
            {
              headers: {
                "X-Connection-Api-Key":
                  candidate === "sandbox"
                    ? Deno.env.get("PADDLE_SANDBOX_API_KEY")!
                    : Deno.env.get("PADDLE_LIVE_API_KEY")!,
                "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
              },
            }
          );
          const subJson = await subRes.json();
          resolvedSubscriptionId = subJson?.data?.[0]?.id || null;
          break;
        } catch (e) {
          console.warn(`Lookup in ${candidate} failed:`, e);
        }
      }

      if (resolvedCustomerId) {
        await admin
          .from("user_subscriptions")
          .update({
            paddle_customer_id: resolvedCustomerId,
            paddle_subscription_id: resolvedSubscriptionId,
            environment: resolvedEnv,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
    }

    if (!resolvedCustomerId) {
      return new Response(
        JSON.stringify({
          error:
            "Could not locate your billing record. Please contact support at islandai_life@outlook.com.",
        }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const paddle = getPaddleClient(resolvedEnv);
    const subscriptionIds = resolvedSubscriptionId ? [resolvedSubscriptionId] : [];
    const portalSession = await paddle.customerPortalSessions.create(
      resolvedCustomerId,
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
