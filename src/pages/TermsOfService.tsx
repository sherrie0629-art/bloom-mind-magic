import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import DesktopLayout from "@/components/DesktopLayout";

const SUPPORT_EMAIL = "islandai_life@outlook.com";
const LAST_UPDATED = "April 19, 2026";

const Terms = () => {
  const { t } = useTranslation();
  return (
    <DesktopLayout maxWidth="2xl">
      <SEO title={`Terms of Service — ${t("home.appName")}`} description="Read the Island AI terms of service covering subscriptions, billing, refunds, privacy, and acceptable use policies." />
      <div className="min-h-screen bg-gradient-calm px-6 py-10 md:px-8 md:py-14">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("legal.backHome")}
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("footer.terms")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("legal.lastUpdated", { d: LAST_UPDATED })}</p>
        {t("legal.noteZhAuto") && <p className="mt-2 text-xs text-muted-foreground italic">{t("legal.noteZhAuto")}</p>}

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
              We offer a <strong>14-day money-back guarantee</strong>. If you are not satisfied with your purchase,
              you may request a full refund within 14 days of your initial order date.
            </p>
            <p className="mt-2">
              Even if you have lightly tried the Service — for example, sent fewer than 5 chat messages or
              completed up to 1 basic assessment — you remain eligible for a full refund within the 14-day window.
              We want you to feel comfortable exploring Island AI before committing.
            </p>
            <p className="mt-2">
              Refunds are processed by our payment provider, <strong>Paddle</strong>, who is the Merchant of
              Record. To request a refund, visit <a className="text-secondary" href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a> or
              contact us at <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
            <p className="mt-2">
              We may decline refund requests in cases of clear abuse — for example, repeated refund requests across
              multiple accounts, or usage patterns consistent with extracting bulk AI output (such as generating
              many deep reports or large volumes of chat content) and then requesting a refund. These decisions are
              made by Paddle in line with their{" "}
              <a className="text-secondary" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">refund policy</a>.
            </p>
            <p className="mt-2">
              For subscription renewals, the same 14-day window applies from the renewal date. We do not provide
              pro-rated refunds for cancellations made mid-period — you keep access until the end of the paid period.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. AI Content & Acceptable Use</h2>
            <p>
              The Service uses generative AI to produce text, interpretations, and reports. By using AI features you
              acknowledge and agree that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>You are responsible for the prompts and inputs you submit, and for how you use the outputs.</li>
              <li>You must have the legal right to any content you submit (text, names, photos, partner information, etc.).</li>
              <li>AI outputs may be inaccurate, incomplete, biased, or inappropriate, and must not be relied on as medical, psychological, psychiatric, legal, financial, or other professional advice.</li>
              <li>We may filter, restrict, or remove outputs and inputs, and suspend or terminate accounts that violate these Terms.</li>
            </ul>
            <p className="mt-2"><strong>Prohibited uses include:</strong></p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Generating sexual content involving minors, or any content that exploits or endangers children</li>
              <li>Deepfakes or impersonation of real people without consent</li>
              <li>Hate speech, harassment, threats, or content that incites violence</li>
              <li>Malware, phishing, fraud, or attempts to jailbreak or bypass safety filters</li>
              <li>Generating non-consensual intimate imagery, defamation, or unlawful content</li>
              <li>Content that infringes intellectual property rights of others</li>
            </ul>
            <p className="mt-2">
              <strong>IP infringement / takedown:</strong> If you believe content generated or hosted on the Service
              infringes your intellectual property rights, send a notice to{" "}
              <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> identifying the
              content and your rights. We will review promptly and may remove infringing material. Accounts of repeat
              infringers will be terminated.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. AI Output Disclaimer</h2>
            <p>
              AI responses are generated automatically and may be inaccurate, incomplete, or inappropriate. You are
              responsible for how you act on AI output. We do not guarantee any specific outcome from using the
              Service, and do not warrant uninterrupted or error-free performance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Intellectual Property</h2>
            <p>
              The Service — including software, design, agent characters, illustrations, written content, and brand
              assets — is owned by <strong>Qian Wang (trading as Island AI)</strong> and protected by applicable IP
              laws. You may not copy, modify, reverse engineer, resell, or redistribute any part of the Service
              without our written permission.
            </p>
            <p className="mt-2">
              You retain ownership of content you submit (your messages, inputs, and answers), and grant us a
              limited, non-exclusive, worldwide license to host, store, process, and display that content solely to
              operate and improve the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. Termination</h2>
            <p>
              We may suspend or terminate your access if you violate these Terms, fail to pay, or pose a security or
              fraud risk. You may stop using the Service at any time and delete your account from the Profile page
              or by emailing us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Qian Wang (trading as Island AI) is not liable for indirect,
              incidental, special, or consequential damages arising from your use of the Service. Nothing in these
              Terms excludes liability for fraud, death, or personal injury where such exclusion is prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">12. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">13. Contact</h2>
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
