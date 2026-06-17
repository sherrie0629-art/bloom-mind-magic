import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SiteFooter = () => {
  const location = useLocation();
  const { t } = useTranslation();
  // Hide footer on chat to avoid covering the input area
  if (location.pathname.startsWith("/chat")) return null;

  return (
    <footer className="w-full border-t border-border/40 bg-background/60 backdrop-blur-sm pb-20 md:pb-4 pt-4 md:pl-[220px]">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-6 text-center md:flex-row md:justify-between">
        <p className="text-[11px] text-muted-foreground/70">
          © {new Date().getFullYear()} Island AI · {t("footer.rights")}
        </p>
        <nav className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <Link to="/contact" className="hover:text-secondary transition-colors">
            {t("footer.contact")}
          </Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="hover:text-secondary transition-colors">
            {t("footer.privacy")}
          </Link>
          <span aria-hidden>·</span>
          <Link to="/terms" className="hover:text-secondary transition-colors">
            {t("footer.terms")}
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default SiteFooter;
