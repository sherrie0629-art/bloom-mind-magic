import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Globe, Volume2 } from "lucide-react";
import { toast } from "sonner";
import DesktopLayout from "@/components/DesktopLayout";
import BottomNav from "@/components/BottomNav";
import SEO from "@/components/SEO";
import { useLocale } from "@/hooks/useLocale";
import { useTTS } from "@/contexts/TTSContext";
import type { Locale } from "@/i18n";

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { enabled, setEnabled, speed, setSpeed, volume, setVolume } = useTTS();

  const handleSelect = async (lng: Locale) => {
    if (lng === locale) return;
    await setLocale(lng);
    toast.success(t("settings.saved"));
  };

  const options: { value: Locale; label: string }[] = [
    { value: "zh", label: t("settings.chinese") },
    { value: "en", label: t("settings.english") },
  ];

  const speedOptions: { value: 0.85 | 1 | 1.15; label: string }[] = [
    { value: 0.85, label: "0.85×" },
    { value: 1, label: "1×" },
    { value: 1.15, label: "1.15×" },
  ];

  return (
    <DesktopLayout>
      <div className="min-h-screen bg-gradient-calm pb-24 md:pb-8">
        <SEO title={`${t("settings.title")} — Soul Sanctuary`} description="Manage your Island AI preferences including language settings and app configuration options." />
        <div className="px-6 pt-10 space-y-5">
          <button
            onClick={() => navigate(-1)}
            className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </button>

          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
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

          {/* Voice / TTS */}
          <section className="rounded-2xl bg-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="h-4 w-4 text-secondary" />
              <h2 className="text-sm font-semibold text-foreground">{t("settings.voice.title")}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t("settings.voice.desc")}</p>

            <label className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 cursor-pointer">
              <span className="text-sm text-foreground">{t("settings.voice.enable")}</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 accent-secondary"
              />
            </label>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">{t("settings.voice.speed")}</p>
              <div className="grid grid-cols-3 gap-2">
                {speedOptions.map((opt) => {
                  const active = opt.value === speed;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setSpeed(opt.value)}
                      disabled={!enabled}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors disabled:opacity-40 ${
                        active
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border bg-background text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{t("settings.voice.volume")}</p>
                <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                disabled={!enabled}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-secondary disabled:opacity-40"
              />
            </div>
          </section>
        </div>
        <BottomNav />
      </div>
    </DesktopLayout>
  );
};

export default Settings;
