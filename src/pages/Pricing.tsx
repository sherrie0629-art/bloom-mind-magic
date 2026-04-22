import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, Loader2 } from "lucide-react";
import DesktopLayout from "@/components/DesktopLayout";
import BottomNav from "@/components/BottomNav";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "yearly";

const FREE_FEATURES = [
  "20 chats per day",
  "5 assessments per day",
  "Basic agent access",
  "Daily mood check-in",
];

const PLUS_FEATURES = [
  "Unlimited chats",
  "Unlimited assessments",
  "1 Deep Report per day",
  "All agents unlocked",
  "Priority response speed",
  "Early access to new features",
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan, isLoading: subLoading } = useSubscription(user?.id, user?.created_at);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [portalLoading, setPortalLoading] = useState(false);

  const isPlus = plan === "plus";

  const handleUpgrade = useCallback(async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      await openCheckout({
        priceId: billingPeriod === "yearly" ? "plus_yearly" : "plus_monthly",
        customerEmail: user.email,
        customData: { userId: user.id },
        successUrl: `${window.location.origin}/profile?checkout=success`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Unable to open checkout, please try again later");
    }
  }, [user, billingPeriod, openCheckout, navigate]);

  const handleManage = useCallback(async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paddle-customer-portal");
      if (error) throw error;
      if (!data?.url) throw new Error("No portal URL returned");
      window.location.href = data.url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Unable to open management page, please try again later");
      setPortalLoading(false);
    }
  }, [user]);

  const plusPrice = billingPeriod === "yearly" ? "$47.99" : "$4.99";
  const plusUnit = billingPeriod === "yearly" ? "/yr" : "/mo";
  const plusSubtext =
    billingPeriod === "yearly"
      ? "Billed annually · approx. $4.00/mo"
      : "Billed monthly · cancel anytime";

  return (
    <>
      <SEO
        title="Pricing — Island AI"
        description="Choose the Island AI plan that fits your journey. Start free or unlock Plus for unlimited chats, deep reports, and every agent."
        canonical={typeof window !== "undefined" ? `${window.location.origin}/pricing` : undefined}
      />
      <DesktopLayout maxWidth="4xl">
        <div className="min-h-screen bg-background pb-24 md:pb-8">
          <div className="px-6 pt-10 md:pt-16">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-2xl mx-auto"
            >
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Choose Your Plan
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground">
                Start with what you need today. Upgrade anytime as your journey deepens.
              </p>
            </motion.div>

            {/* Billing toggle */}
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center rounded-full border border-border bg-card/60 backdrop-blur-sm p-1">
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-full transition-colors",
                    billingPeriod === "monthly"
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod("yearly")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5",
                    billingPeriod === "yearly"
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Yearly
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                      billingPeriod === "yearly"
                        ? "bg-secondary-foreground/15 text-secondary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan cards */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto">
              {/* Free */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="relative rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-6 md:p-7 flex flex-col"
              >
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Free</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    For exploring at your own pace
                  </p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">$0</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  disabled={!!user && !isPlus}
                  onClick={() => {
                    if (!user) navigate("/auth");
                  }}
                >
                  {user && !isPlus ? "Current Plan" : "Get Started"}
                </Button>
              </motion.div>

              {/* Plus */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-primary/5 via-card/80 to-card/60 backdrop-blur-sm p-6 md:p-7 flex flex-col shadow-lg shadow-primary/10"
              >
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-md">
                    <Crown className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    Plus
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Go deeper, without limits
                  </p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plusPrice}</span>
                    <span className="text-sm text-muted-foreground">{plusUnit}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{plusSubtext}</p>
                </div>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {PLUS_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isPlus ? (
                  <Button
                    className="mt-6 w-full"
                    onClick={handleManage}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening…
                      </>
                    ) : (
                      "Manage Subscription"
                    )}
                  </Button>
                ) : (
                  <Button
                    className="mt-6 w-full"
                    onClick={handleUpgrade}
                    disabled={checkoutLoading || subLoading}
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4" />
                        Upgrade to Plus
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            </div>

            {/* Refund note */}
            <p className="mt-8 text-center text-xs text-muted-foreground/80">
              14-day money-back guarantee · Cancel anytime
            </p>
          </div>
        </div>
        <BottomNav />
      </DesktopLayout>
    </>
  );
};

export default Pricing;
