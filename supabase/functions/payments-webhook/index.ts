import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyWebhook, EventName, type PaddleEnv } from "../_shared/paddle.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Map Paddle price external_id → billing_period column for our existing user_subscriptions table.
function billingPeriodFromPriceId(priceId: string | undefined): "monthly" | "yearly" {
  if (!priceId) return "monthly";
  return priceId.toLowerCase().includes("year") ? "yearly" : "monthly";
}

// Active Paddle statuses → "plus"; everything else → "free"
function planFromStatus(status: string | undefined): "plus" | "free" {
  return status === "active" || status === "trialing" ? "plus" : "free";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Paddle event:", event.eventType, "env:", env);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await upsertSubscription(event.data);
        break;
      case EventName.SubscriptionCanceled:
        await cancelSubscription(event.data);
        break;
      case EventName.TransactionCompleted:
        console.log("Transaction completed:", (event.data as any).id);
        break;
      case EventName.TransactionPaymentFailed:
        console.log("Payment failed:", (event.data as any).id);
        break;
      default:
        console.log("Unhandled event:", event.eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

async function upsertSubscription(data: any) {
  const { items, status, currentBillingPeriod, customData, scheduledChange } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error("No userId in customData; skipping");
    return;
  }

  const item = items?.[0];
  const priceExternalId: string | undefined =
    item?.price?.importMeta?.externalId || item?.price?.id;

  const billingPeriod = billingPeriodFromPriceId(priceExternalId);
  const plan = planFromStatus(status);

  // If user scheduled cancel, expires_at = period end; otherwise next renewal date.
  const expiresAt =
    scheduledChange?.action === "cancel"
      ? scheduledChange?.effectiveAt || currentBillingPeriod?.endsAt
      : currentBillingPeriod?.endsAt || null;

  const { error } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        plan,
        billing_period: billingPeriod,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) console.error("upsert error:", error);
  else console.log(`user ${userId} → plan=${plan}, period=${billingPeriod}, expires=${expiresAt}`);
}

async function cancelSubscription(data: any) {
  const { customData, currentBillingPeriod } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error("No userId in customData; skipping cancel");
    return;
  }

  const endsAt = currentBillingPeriod?.endsAt || null;

  // Keep "plus" until period end so useSubscription gates correctly via expires_at.
  const { error } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: endsAt ? "plus" : "free",
        expires_at: endsAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) console.error("cancel upsert error:", error);
  else console.log(`user ${userId} canceled, access until ${endsAt}`);
}
