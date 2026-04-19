import { Link, useLocation } from "react-router-dom";

const SiteFooter = () => {
  const location = useLocation();
  // Hide footer on chat to avoid covering the input area
  if (location.pathname.startsWith("/chat")) return null;

  return (
    <footer className="w-full border-t border-border/40 bg-background/60 backdrop-blur-sm pb-20 md:pb-4 pt-4">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-6 text-center md:flex-row md:justify-between">
        <p className="text-[11px] text-muted-foreground/70">
          © {new Date().getFullYear()} Island AI · All rights reserved
        </p>
        <nav className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <Link to="/contact" className="hover:text-secondary transition-colors">
            Contact Us
          </Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="hover:text-secondary transition-colors">
            Privacy Policy
          </Link>
          <span aria-hidden>·</span>
          <Link to="/terms" className="hover:text-secondary transition-colors">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default SiteFooter;
