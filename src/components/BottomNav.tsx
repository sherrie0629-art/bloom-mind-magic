import { Home, BookOpen, Sparkles, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: BookOpen, label: t("nav.archive"), path: "/archive" },
    { icon: Sparkles, label: t("nav.assess"), path: "/assessment" },
    { icon: User, label: t("nav.me"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-4 py-1 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 h-0.5 w-6 rounded-full bg-gradient-golden"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
