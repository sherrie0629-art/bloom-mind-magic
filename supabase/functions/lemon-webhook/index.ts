import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET");
    if (!secret) {
      console.error("LEMON_SQUEEZY_WEBHOOK_SECRET not set");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const signature = req.headers.get("x-signature") || "";

    const valid = await verifySignature(body, signature, secret);
    if (!valid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data || {};
    const userId = customData.user_id;
    const attrs = event.data?.attributes || {};

    console.log(`Received event: ${eventName}, user_id: ${userId}, status: ${attrs.status}`);

    if (!userId) {
      // order_created may not always have custom_data depending on config — log and accept
      console.warn("No user_id in custom_data, skipping DB update");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── order_created ───
    // Initial order — log it but subscription_created handles the actual activation
    if (eventName === "order_created") {
      console.log(`Order created for ${userId}, amount: ${attrs.total_formatted || attrs.total}`);
      // No subscription upsert here; wait for subscription_created
    }

    // ─── subscription_created / subscription_updated ───
    if (
      eventName === "subscription_created" ||
      eventName === "subscription_updated"
    ) {
      const status = attrs.status; // active, on_trial, past_due, paused, cancelled, expired
      const isActive = status === "active" || status === "on_trial";
      const billingInterval = attrs.variant_name?.toLowerCase().includes("year") ? "yearly" : "monthly";

      // ends_at is set when subscription is cancelled (access until this date)
      // renews_at is the next billing date for active subscriptions
      const expiresAt = attrs.ends_at || attrs.renews_at || null;

      const { error } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: isActive ? "plus" : "free",
            billing_period: billingInterval,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Upsert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Subscription ${eventName} — plan=${isActive ? "plus" : "free"}, expires_at=${expiresAt}, status=${status}`);
    }

    // ─── subscription_cancelled ───
    // User cancelled but still has access until ends_at
    if (eventName === "subscription_cancelled") {
      const endsAt = attrs.ends_at || null;

      // Keep plan as "plus" until ends_at — the client-side useSubscription
      // checks expires_at to determine if the subscription is still valid
      const { error } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: endsAt ? "plus" : "free", // keep plus if there's remaining time
            billing_period: attrs.variant_name?.toLowerCase().includes("year") ? "yearly" : "monthly",
            expires_at: endsAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) console.error("Cancel upsert error:", error);
      console.log(`Subscription cancelled for ${userId}, access until: ${endsAt}`);
    }

    // ─── subscription_payment_success ───
    if (eventName === "subscription_payment_success") {
      // Renewal payment succeeded — ensure plan stays active
      // subscription_updated usually fires too, but this is a safety net
      console.log(`Payment success for ${userId}`);
    }

    // ─── subscription_payment_failed ───
    if (eventName === "subscription_payment_failed") {
      // Payment failed — log it; Lemon Squeezy will retry and eventually
      // fire subscription_updated with status=past_due or subscription_expired
      console.warn(`Payment failed for ${userId}, awaiting retry or expiration`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
