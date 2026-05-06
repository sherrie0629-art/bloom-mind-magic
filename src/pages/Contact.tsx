import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import DesktopLayout from "@/components/DesktopLayout";

const SUPPORT_EMAIL = "islandai_life@outlook.com";

const Contact = () => {
  const { t } = useTranslation();
  return (
    <DesktopLayout maxWidth="2xl">
      <SEO title={`${t("contact.title")} — ${t("home.appName")}`} description={t("contact.subtitle")} />
      <div className="min-h-screen bg-gradient-calm px-6 py-10 md:px-8 md:py-14">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("contact.back")}
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("contact.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("contact.subtitle")}</p>

        <div className="mt-8 rounded-2xl bg-card p-6 shadow-card border border-secondary/10">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-secondary/10 p-2.5">
              <Mail className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t("contact.email")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("contact.replyHint")}</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 inline-block text-sm text-secondary font-medium">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <Button asChild className="mt-5 w-full md:w-auto">
            <a href={`mailto:${SUPPORT_EMAIL}`}>{t("contact.sendBtn")}</a>
          </Button>
        </div>

        <div className="mt-6 text-xs text-muted-foreground leading-relaxed">
          {t("contact.footnote")}
        </div>
      </div>
    </DesktopLayout>
  );
};

export default Contact;
