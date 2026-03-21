import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Chat from "./pages/Chat.tsx";
import Assessment from "./pages/Assessment.tsx";
import AssessmentFlow from "./pages/AssessmentFlow.tsx";
import AssessmentDetail from "./pages/AssessmentDetail.tsx";
import AssessmentReports from "./pages/AssessmentReports.tsx";
import BaziFlow from "./pages/BaziFlow.tsx";
import ZodiacFlow from "./pages/ZodiacFlow.tsx";
import EmotionFlow from "./pages/EmotionFlow.tsx";
import CompatibilityFlow from "./pages/CompatibilityFlow.tsx";
import CompatibilityReports from "./pages/CompatibilityReports.tsx";
import CompatibilityDetail from "./pages/CompatibilityDetail.tsx";
import Profile from "./pages/Profile.tsx";
import Auth from "./pages/Auth.tsx";
import ConversationHistory from "./pages/ConversationHistory.tsx";
import DailyWhisper from "./pages/DailyWhisper.tsx";
import AgentArchive from "./pages/AgentArchive.tsx";
import Vault from "./pages/Vault.tsx";
import SoulMap from "./pages/SoulMap.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/conversations" element={<ConversationHistory />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/assessment-reports" element={<AssessmentReports />} />
            <Route path="/assessment-reports/:id" element={<AssessmentDetail />} />
            <Route path="/assessment/mbti" element={<AssessmentFlow />} />
            <Route path="/assessment/bazi" element={<BaziFlow />} />
            <Route path="/assessment/zodiac" element={<ZodiacFlow />} />
            <Route path="/assessment/emotion" element={<EmotionFlow />} />
            <Route path="/assessment/compatibility" element={<CompatibilityFlow />} />
            <Route path="/compatibility-reports" element={<CompatibilityReports />} />
            <Route path="/compatibility-reports/:id" element={<CompatibilityDetail />} />
            <Route path="/daily-whisper" element={<DailyWhisper />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/archive" element={<AgentArchive />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/soul-map" element={<SoulMap />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
