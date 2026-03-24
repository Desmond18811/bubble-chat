import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FeedPage from "./pages/FeedPage";
import MessagesPage from "./pages/MessagesPage";
import WorkspacePage from "./pages/WorkspacePage";
import MeetPage from "./pages/MeetPage";
import CommunityPage from "./pages/CommunityPage";
import SavedPage from "./pages/SavedPage";
import CalendarPage from "./pages/CalendarPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/meet" element={<MeetPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
