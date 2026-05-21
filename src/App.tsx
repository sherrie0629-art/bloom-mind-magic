import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import SiteFooter from "./components/SiteFooter.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner.tsx";
import LocaleSync from "./components/LocaleSync.tsx";

// Retry dynamic import once, then force a hard reload if a stale route chunk cannot be fetched
// (typically after a new deploy invalidated the previous hashed chunk file names).
// The reload guard is scoped to the current route and expires quickly so one stale chunk does
// not leave the app permanently unable to recover from another lazy page import failure.
function lazyWithReload<T extends { default: React.ComponentType<any> }>(factory: () => Promise<T>) {
  return lazy(async () => {
    try {
      const module = await factory();
      sessionStorage.removeItem("__chunk_reload_guard__");
      return module;
    } catch (err) {
      try {
        const module = await factory();
        sessionStorage.removeItem("__chunk_reload_guard__");
        return module;
      } catch (err2) {
        const now = Date.now();
        const routeKey = `${window.location.pathname}${window.location.search}`;
        const guardValue = sessionStorage.getItem("__chunk_reload_guard__");
        const guard = guardValue ? JSON.parse(guardValue) as { routeKey?: string; timestamp?: number } : null;
        const hasRecentlyReloaded = guard?.routeKey === routeKey && now - (guard.timestamp ?? 0) < 30_000;

        if (!hasRecentlyReloaded) {
          sessionStorage.setItem("__chunk_reload_guard__", JSON.stringify({ routeKey, timestamp: now }));
          window.location.reload();
          // Return a placeholder while reload happens
          return { default: () => null } as unknown as T;
        }
        throw err2;
      }
    }
  });
}

const Chat = lazyWithReload(() => import("./pages/Chat.tsx"));
const Assessment = lazyWithReload(() => import("./pages/Assessment.tsx"));
const AssessmentFlow = lazyWithReload(() => import("./pages/AssessmentFlow.tsx"));
const AssessmentDetail = lazyWithReload(() => import("./pages/AssessmentDetail.tsx"));
const AssessmentReports = lazyWithReload(() => import("./pages/AssessmentReports.tsx"));
const EnneagramFlow = lazyWithReload(() => import("./pages/EnneagramFlow.tsx"));
const ZodiacFlow = lazyWithReload(() => import("./pages/ZodiacFlow.tsx"));
const EmotionFlow = lazyWithReload(() => import("./pages/EmotionFlow.tsx"));
const CompatibilityFlow = lazyWithReload(() => import("./pages/CompatibilityFlow.tsx"));
const CompatibilityReports = lazyWithReload(() => import("./pages/CompatibilityReports.tsx"));
const CompatibilityDetail = lazyWithReload(() => import("./pages/CompatibilityDetail.tsx"));
const Profile = lazyWithReload(() => import("./pages/Profile.tsx"));
const Auth = lazyWithReload(() => import("./pages/Auth.tsx"));
const ConversationHistory = lazyWithReload(() => import("./pages/ConversationHistory.tsx"));
const DailyTarot = lazyWithReload(() => import("./pages/DailyTarot.tsx"));
const AgentArchive = lazyWithReload(() => import("./pages/AgentArchive.tsx"));
const Vault = lazyWithReload(() => import("./pages/Vault.tsx"));
const SoulMap = lazyWithReload(() => import("./pages/SoulMap.tsx"));
const Admin = lazyWithReload(() => import("./pages/Admin.tsx"));
const Settings = lazyWithReload(() => import("./pages/Settings.tsx"));
const Welcome = lazyWithReload(() => import("./pages/Welcome.tsx"));
const Contact = lazyWithReload(() => import("./pages/Contact.tsx"));
const PrivacyPolicy = lazyWithReload(() => import("./pages/PrivacyPolicy.tsx"));
const TermsOfService = lazyWithReload(() => import("./pages/TermsOfService.tsx"));
const Pricing = lazyWithReload(() => import("./pages/Pricing.tsx"));
const NotFound = lazyWithReload(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LocaleSync />
          <PaymentTestModeBanner />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/conversations" element={<ConversationHistory />} />
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/assessment-reports" element={<AssessmentReports />} />
              <Route path="/assessment-reports/:id" element={<AssessmentDetail />} />
              <Route path="/assessment/mbti" element={<AssessmentFlow />} />
              <Route path="/assessment/enneagram" element={<EnneagramFlow />} />
              
              <Route path="/assessment/zodiac" element={<ZodiacFlow />} />
              <Route path="/assessment/emotion" element={<EmotionFlow />} />
              <Route path="/assessment/compatibility" element={<CompatibilityFlow />} />
              <Route path="/compatibility-reports" element={<CompatibilityReports />} />
              <Route path="/compatibility-reports/:id" element={<CompatibilityDetail />} />
              <Route path="/daily-tarot" element={<DailyTarot />} />
              <Route path="/daily-whisper" element={<Navigate to="/daily-tarot" replace />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/archive" element={<AgentArchive />} />
              <Route path="/vault" element={<Vault />} />
              <Route path="/soul-map" element={<SoulMap />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <SiteFooter />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
