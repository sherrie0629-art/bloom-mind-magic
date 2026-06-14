import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Globe } from "lucide-react";
import { toast } from "sonner";
import DesktopLayout from "@/components/DesktopLayout";
import BottomNav from "@/components/BottomNav";
import SEO from "@/components/SEO";
import { useLocale } from "@/hooks/useLocale";
import type { Locale } from "@/i18n";

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  const handleSelect = async (lng: Locale) => {
    if (lng === locale) return;
    await setLocale(lng);
    toast.success(t("settings.saved"));
  };

  const options: { value: Locale; label: string }[] = [
    { value: "zh", label: t("settings.chinese") },
    { value: "en", label: t("settings.english") },
  ];

  return (
    <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
        <SEO title={`${t("settings.title")} — Soul Sanctuary`} description="Manage your Island AI preferences including language settings and app configuration options." />
        <div className="px-6 pt-10">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </button>

          <h1 className="font-display text-2xl font-semibold text-foreground mb-6">
            {t("settings.title")}
          </h1>

          <section className="rounded-2xl bg-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{t("settings.language")}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t("settings.languageDesc")}</p>

            <div className="grid grid-cols-2 gap-3">
              {options.map((opt) => {
                const active = opt.value === locale;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`relative flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {active && <Check className="h-4 w-4" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <BottomNav />
      </div>
    </DesktopLayout>
  );
};

export default Settings;
