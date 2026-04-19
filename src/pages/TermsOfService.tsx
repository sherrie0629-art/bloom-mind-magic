import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import DesktopLayout from "@/components/DesktopLayout";

const SUPPORT_EMAIL = "islandai_life@outlook.com";
const LAST_UPDATED = "April 19, 2026";

const Terms = () => {
  return (
    <DesktopLayout maxWidth="2xl">
      <SEO title="Terms of Service — Island AI" description="Island AI terms covering use of the service, subscriptions, billing, refunds, and user responsibilities." />
      <div className="min-h-screen bg-gradient-calm px-6 py-10 md:px-8 md:py-14">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              Island AI ("the Service") is operated by <strong>Qian Wang (trading as Island AI)</strong> ("we", "our", "us").
              By accessing or using the Service, you are entering into an agreement with Qian Wang and agree to these
              Terms of Service. If you do not agree, please do not use the Service.
            </p>
            <p className="mt-2">
              <strong>Merchant of Record.</strong> Our order process is conducted by our online reseller{" "}
              <a className="text-secondary" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">Paddle.com</a>.
              Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries
              and handles returns.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. The Service</h2>
            <p>
              Island AI provides AI-powered companion chat, personality assessments, daily tarot draws, and
              relationship insights for entertainment and self-reflection.
            </p>
            <p className="mt-2">
              <strong>Not professional advice.</strong> The Service is not a substitute for medical, psychological,
              psychiatric, legal, or financial advice. If you are in crisis, please contact a qualified professional
              or local emergency services.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Accounts</h2>
            <p>
              You must be at least 13 years old (or the minimum age in your jurisdiction). You are responsible for
              keeping your credentials secure and for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Acceptable Use</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>No illegal, harmful, hateful, or harassing content</li>
              <li>No attempts to reverse engineer, scrape, or overload the Service</li>
              <li>No use of the Service to generate content involving minors in a sexual context</li>
              <li>No impersonation or misuse of another person's identity</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Subscriptions & Billing</h2>
            <p>
              Some features require a paid subscription. By subscribing, you authorize us and our payment processor
              to charge your payment method on a recurring basis.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li><strong>Auto-renewal:</strong> Subscriptions renew automatically at the end of each billing period (monthly or yearly) unless cancelled at least 24 hours before the renewal date.</li>
              <li><strong>Pricing:</strong> Prices are shown at checkout and may change with prior notice; changes do not affect the current paid period.</li>
              <li><strong>How to cancel:</strong> You can cancel anytime in the <Link to="/profile" className="text-secondary">Profile</Link> page. After cancellation, you keep access until the end of the current billing period.</li>
              <li><strong>Failed payment:</strong> If a renewal payment fails, the subscription may be suspended until payment succeeds.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Refund Policy</h2>
            <p>
              We offer a <strong>14-day money-back guarantee for accounts with zero consumption</strong>. If you
              have not utilized any AI features or consumed any tokens (e.g., AI chats, personality reports, tarot
              insights, or deep reports) after your purchase, you may request a full refund within 14 days of your
              initial order date.
            </p>
            <p className="mt-2">
              Once any AI services have been generated or tokens have been consumed, the order becomes
              <strong> non-refundable</strong> due to the immediate resource costs incurred (compute, third-party
              AI inference, and storage).
            </p>
            <p className="mt-2">
              Refunds are processed by our payment provider, <strong>Paddle</strong>, who is the Merchant of
              Record. To request a refund, visit <a className="text-secondary" href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a> or
              contact us at <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
            <p className="mt-2">
              Renewal payments follow the same rule: a renewal is refundable only if no paid features have been
              used in the new billing period. We do not provide pro-rated refunds for cancellations made mid-period
              — you keep access until the end of the paid period.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. AI Output Disclaimer</h2>
            <p>
              AI responses are generated automatically and may be inaccurate, incomplete, or inappropriate. You are
              responsible for how you act on AI output. We do not guarantee any specific outcome from using the
              Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Intellectual Property</h2>
            <p>
              The Service, including software, design, agent characters, and brand assets, is owned by Island AI.
              You retain ownership of content you submit, and grant us a limited license to host and process it
              solely to operate the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Termination</h2>
            <p>
              We may suspend or terminate your access if you violate these Terms. You may stop using the Service at
              any time and delete your account from the Profile page or by emailing us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Island AI is not liable for indirect, incidental, special, or
              consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">11. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">12. Contact</h2>
            <p>
              Questions about these Terms? Email <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </DesktopLayout>
  );
};

export default Terms;
