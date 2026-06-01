import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FeedPage from "./pages/FeedPage";
import MessagesPage from "./pages/MessagesPage";
import WorkspacePage from "./pages/WorkspacePage";
import SharedWorkspacePage from "./pages/SharedWorkspacePage";
import MeetPage from "./pages/MeetPage";
import CommunityPage from "./pages/CommunityPage";
import CommunityMessagesPage from "./pages/CommunityMessagesPage";
import SavedPage from "./pages/SavedPage";
import CalendarPage from "./pages/CalendarPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import LogoutPage from "./pages/LogoutPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import VerifyOTPPage from "./pages/auth/VerifyOTPPage";
import GoogleCallbackPage from "./pages/auth/GoogleCallbackPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import AidaPage from "./pages/AidaPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import { Navigate } from "react-router-dom";


// Protected Route Component — checks token exists AND is not expired
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;

  // Decode JWT exp field (base64 payload, no library needed)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token has expired — clear storage and redirect with reason
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return <Navigate to="/login?reason=expired" replace />;
    }
  } catch {
    // Malformed token — treat as invalid
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return <Navigate to="/login?reason=expired" replace />;
  }

  return <>{children}</>;
};


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          {/* Onboarding — needs token but skips onboarding check */}
          <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />

          <Route path="/feed" element={<Navigate to="/messages" replace />} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/workspace" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
          <Route path="/workspace/shared/:folderId" element={<SharedWorkspacePage />} />
          <Route path="/meet/*" element={<ProtectedRoute><MeetPage /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/community/:id/messages" element={<ProtectedRoute><CommunityMessagesPage /></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><AidaPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
