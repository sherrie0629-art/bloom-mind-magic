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

const Chat = lazy(() => import("./pages/Chat.tsx"));
const Assessment = lazy(() => import("./pages/Assessment.tsx"));
const AssessmentFlow = lazy(() => import("./pages/AssessmentFlow.tsx"));
const AssessmentDetail = lazy(() => import("./pages/AssessmentDetail.tsx"));
const AssessmentReports = lazy(() => import("./pages/AssessmentReports.tsx"));
const EnneagramFlow = lazy(() => import("./pages/EnneagramFlow.tsx"));
const ZodiacFlow = lazy(() => import("./pages/ZodiacFlow.tsx"));
const EmotionFlow = lazy(() => import("./pages/EmotionFlow.tsx"));
const CompatibilityFlow = lazy(() => import("./pages/CompatibilityFlow.tsx"));
const CompatibilityReports = lazy(() => import("./pages/CompatibilityReports.tsx"));
const CompatibilityDetail = lazy(() => import("./pages/CompatibilityDetail.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ConversationHistory = lazy(() => import("./pages/ConversationHistory.tsx"));
const DailyTarot = lazy(() => import("./pages/DailyTarot.tsx"));
const AgentArchive = lazy(() => import("./pages/AgentArchive.tsx"));
const Vault = lazy(() => import("./pages/Vault.tsx"));
const SoulMap = lazy(() => import("./pages/SoulMap.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

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
