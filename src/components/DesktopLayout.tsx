import { Home, BookOpen, Sparkles, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface DesktopLayoutProps {
  children: React.ReactNode;
  /** Apply max-width constraint to content area. Default: "2xl" */
  maxWidth?: "xl" | "2xl" | "4xl" | "full";
}

const DesktopLayout = ({ children, maxWidth = "2xl" }: DesktopLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: BookOpen, label: t("nav.archive"), path: "/archive" },
    { icon: Sparkles, label: t("nav.assess"), path: "/assessment" },
    { icon: User, label: t("nav.me"), path: "/profile" },
  ];


  const maxWidthClass = {
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    full: "",
  }[maxWidth];

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] flex-col border-r border-border bg-card/80 backdrop-blur-xl z-50">
        {/* Logo */}
        <div className="px-5 pt-8 pb-6">
          <h1 className="font-display text-lg font-bold text-foreground">{t("home.appName")}</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t("home.appTagline")}</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground">islandai.life</p>
        </div>
      </aside>

      {/* Content area */}
      <div className="md:ml-[220px]">
        <div className={`${maxWidthClass} mx-auto`}>
          {children}
        </div>
      </div>
    </>
  );
};

export default DesktopLayout;

