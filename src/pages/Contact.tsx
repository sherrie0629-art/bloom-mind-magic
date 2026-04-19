import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import DesktopLayout from "@/components/DesktopLayout";

const SUPPORT_EMAIL = "islandai_life@outlook.com";

const Contact = () => {
  return (
    <DesktopLayout maxWidth="2xl">
      <SEO title="Contact Us — Island AI" description="Get in touch with the Island AI team for support, feedback, or partnership." />
      <div className="min-h-screen bg-gradient-calm px-6 py-10 md:px-8 md:py-14">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Contact Us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We'd love to hear from you. Whether you have a question, feedback, or need support, reach out anytime.
        </p>

        <div className="mt-8 rounded-2xl bg-card p-6 shadow-card border border-secondary/10">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-secondary/10 p-2.5">
              <Mail className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Email Support</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Replies typically within 1–2 business days.
              </p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 inline-block text-sm text-secondary font-medium">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <Button asChild className="mt-5 w-full md:w-auto">
            <a href={`mailto:${SUPPORT_EMAIL}`}>Send us an email</a>
          </Button>
        </div>

        <div className="mt-6 text-xs text-muted-foreground leading-relaxed">
          For privacy or data requests, please mention "Privacy Request" in your subject line. For refund or billing
          inquiries, include your account email and order reference if available.
        </div>
      </div>
    </DesktopLayout>
  );
};

export default Contact;
