import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import DesktopLayout from "@/components/DesktopLayout";

const SUPPORT_EMAIL = "islandai_life@outlook.com";
const LAST_UPDATED = "April 19, 2026";

const Privacy = () => {
  const { t } = useTranslation();
  return (
    <DesktopLayout maxWidth="2xl">
      <SEO title={`Privacy Policy — ${t("home.appName")}`} description="How Island AI collects, uses, and protects your data." />
      <div className="min-h-screen bg-gradient-calm px-6 py-10 md:px-8 md:py-14">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("legal.backHome")}
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("footer.privacy")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("legal.lastUpdated", { d: LAST_UPDATED })}</p>
        {t("legal.noteZhAuto") && <p className="mt-2 text-xs text-muted-foreground italic">{t("legal.noteZhAuto")}</p>}

        <div className="mt-8 space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              Island AI ("we", "our", "the Service") is operated by <strong>Qian Wang (trading as Island AI)</strong>,
              who acts as the <strong>data controller</strong> for personal data processed through the Service.
              This policy explains what we collect, how we use it, who we share it with, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <h3 className="text-sm font-semibold mt-3 mb-1">a) Account Information</h3>
            <p>When you sign in with email or Google, we collect:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Email address</li>
              <li>Display name (from Google profile, if applicable)</li>
              <li>Profile picture URL (from Google profile, if applicable)</li>
              <li>A unique user identifier</li>
            </ul>
            <p className="mt-2">
              <strong>Google Sign-In:</strong> We only request the basic OAuth scopes (<code>openid</code>,
              <code> email</code>, <code>profile</code>). We do <strong>not</strong> access your Gmail, Google Drive,
              Calendar, Contacts, or any other Google service data.
            </p>

            <h3 className="text-sm font-semibold mt-4 mb-1">b) Conversation & Assessment Data</h3>
            <p>
              We store messages you send to AI companions, assessment answers, results, daily tarot draws, and
              relationship reports. This is necessary to deliver the Service and preserve your history across devices.
            </p>

            <h3 className="text-sm font-semibold mt-4 mb-1">c) Technical Data</h3>
            <p>
              Standard logs (IP address, user agent, timestamps, device identifiers) for security, debugging, and
              abuse prevention.
            </p>

            <h3 className="text-sm font-semibold mt-4 mb-1">d) Billing Data</h3>
            <p>
              When you subscribe, our payment processor Paddle collects your name, billing country, and payment
              details directly. We receive only the order confirmation, plan, and limited transaction metadata —
              we do <strong>not</strong> see or store your full card number.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. How We Use Your Data & Legal Basis</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Account information</strong> — to authenticate you and operate your account (legal basis: performance of contract).</li>
              <li><strong>Conversation & assessment data</strong> — to provide and personalize AI conversations and results (performance of contract).</li>
              <li><strong>Technical logs</strong> — for security, fraud prevention, and reliability (legitimate interests).</li>
              <li><strong>Billing data</strong> — to process subscription payments and comply with tax/accounting obligations (contract and legal obligation).</li>
              <li><strong>Optional marketing emails</strong>, if you opt in — to inform you about new features (consent; you may withdraw at any time).</li>
            </ul>
            <p className="mt-2">
              <strong>We do not sell your data.</strong> We do <strong>not</strong> use your conversations to train
              third-party foundation models. Your chat content is sent to our AI provider only to generate the next
              reply, governed by their data-processing terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Data Storage & Security</h2>
            <p>
              All data is stored in our managed cloud backend (Supabase / Lovable Cloud) with row-level security so
              that only you can access your own records. Data is encrypted in transit (TLS) and at rest. We apply
              appropriate technical and organisational measures to protect your data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Cookies & Local Storage</h2>
            <p>
              We use essential cookies and browser local storage to keep you signed in and remember preferences. We do
              not use third-party advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Sharing With Paddle (Merchant of Record)</h2>
            <p>
              We share order and billing-related data (name, email, billing country, transaction details) with{" "}
              <strong>Paddle.com Market Limited</strong>, our Merchant of Record. Paddle processes payments,
              calculates and remits sales tax, issues invoices, and handles refund requests on our behalf. Paddle
              acts as an independent data controller for this purpose. See Paddle's privacy policy at{" "}
              <a className="text-secondary" href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer">paddle.com/legal/privacy</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Other Recipients</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Hosting & backend infrastructure</strong> (Supabase / Lovable Cloud) — to store and serve your data.</li>
              <li><strong>AI inference providers</strong> — to generate replies, interpretations, and reports based on your inputs.</li>
              <li><strong>Email/auth providers</strong> — to deliver login and notification emails.</li>
              <li><strong>Professional advisers</strong> (legal, accounting) where necessary.</li>
              <li><strong>Authorities</strong> where disclosure is required by law.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Account data</strong> — retained while your account is active; deleted within 30 days of an account-deletion request.</li>
              <li><strong>Conversation, assessment, and tarot data</strong> — retained while your account is active; deleted with your account.</li>
              <li><strong>Technical logs</strong> — retained for up to 90 days, then deleted or anonymised.</li>
              <li><strong>Billing/transaction records</strong> — retained by Paddle and by us for the period required by tax and accounting law (typically up to 7 years).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Your Rights</h2>
            <p>Subject to applicable law, you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Rectify</strong> inaccurate or incomplete data</li>
              <li><strong>Erase</strong> your account and associated data</li>
              <li><strong>Restrict</strong> or <strong>object</strong> to certain processing</li>
              <li><strong>Data portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong>Withdraw consent</strong> at any time where processing is based on consent</li>
              <li><strong>Lodge a complaint</strong> with your local data protection supervisory authority</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email{" "}
              <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We will respond
              within one month.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. International Transfers</h2>
            <p>
              Personal data may be processed outside the UK/EEA by our service providers (for example, hosting and
              AI inference providers based in the United States). Where this happens, we rely on Standard
              Contractual Clauses, adequacy decisions, or other lawful safeguards to protect your data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">11. Children's Privacy</h2>
            <p>
              The Service is not directed to children under 13. We do not knowingly collect data from children. If
              you believe a child has provided us with personal data, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">12. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be announced in-app or by email.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">13. Contact</h2>
            <p>
              <strong>Data controller:</strong> Qian Wang (trading as Island AI).<br />
              Questions or privacy requests? Email{" "}
              <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </DesktopLayout>
  );
};

export default Privacy;
