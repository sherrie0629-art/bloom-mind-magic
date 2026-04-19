import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import DesktopLayout from "@/components/DesktopLayout";

const SUPPORT_EMAIL = "islandai_life@outlook.com";
const LAST_UPDATED = "April 19, 2026";

const Privacy = () => {
  return (
    <DesktopLayout maxWidth="2xl">
      <SEO title="Privacy Policy — Island AI" description="How Island AI collects, uses, and protects your data, including Google account information and chat conversations." />
      <div className="min-h-screen bg-gradient-calm px-6 py-10 md:px-8 md:py-14">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              Island AI ("we", "our", "the Service") provides AI companion conversations and personality assessments.
              This policy explains what we collect, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <h3 className="text-sm font-semibold mt-3 mb-1">a) Account Information</h3>
            <p>
              When you sign in with email or Google, we collect:
            </p>
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
              Standard logs (IP, user agent, timestamps) for security and abuse prevention.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>To provide and personalize AI conversations and assessment results</li>
              <li>To authenticate you and secure your account</li>
              <li>To improve product quality and fix issues</li>
              <li>To process subscription payments (via our payment processor)</li>
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
              that only you can access your own records. Data is encrypted in transit (TLS) and at rest.
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
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Access or export your data on request</li>
              <li>Correct inaccurate profile information</li>
              <li>Delete your account and associated data</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Children's Privacy</h2>
            <p>
              The Service is not directed to children under 13. We do not knowingly collect data from children.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be announced in-app or by email.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Contact</h2>
            <p>
              Questions? Email <a className="text-secondary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </DesktopLayout>
  );
};

export default Privacy;
