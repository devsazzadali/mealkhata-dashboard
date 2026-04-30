import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import RoleRedirect from "./pages/RoleRedirect";
import MessDashboard from "./pages/admin/MessDashboard";
import Boarders from "./pages/admin/Boarders";
import Meals from "./pages/admin/Meals";
import Expenses from "./pages/admin/Expenses";
import Deposits from "./pages/admin/Deposits";
import Balance from "./pages/admin/Balance";
import Stocks from "./pages/admin/Stocks";
import Notices from "./pages/admin/Notices";
import Settings from "./pages/admin/Settings";
import MyDashboard from "./pages/boarder/MyDashboard";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Call from "./pages/Call";
import JoinRequests from "./pages/admin/JoinRequests";
import ExtraBills from "./pages/admin/ExtraBills";
import MonthlyBills from "./pages/admin/MonthlyBills";
import Reports from "./pages/admin/Reports";
import { PlaceholderPage } from "./components/PlaceholderPage";
import Gallery from "./pages/admin/Gallery";
import BazarSchedule from "./pages/admin/BazarSchedule";
import Feedback from "./pages/admin/Feedback";
import Events from "./pages/admin/Events";
import Advertisements from "./pages/admin/Advertisements";
import DailyMenu from "./pages/admin/DailyMenu";
import SuperMesses from "./pages/super/SuperMesses";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Sonner position="top-right" richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/home" element={<RoleRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              {/* Fullscreen call (outside AppLayout) */}
              <Route
                path="/app/call/:roomId"
                element={
                  <ProtectedRoute allow={["mess_admin", "super_admin"]}>
                    <Call />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/call/:roomId"
                element={
                  <ProtectedRoute allow={["boarder"]}>
                    <Call />
                  </ProtectedRoute>
                }
              />

              {/* Mess Admin */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute allow={["mess_admin", "super_admin"]}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MessDashboard />} />
                <Route path="boarders" element={<Boarders />} />
                <Route path="meals" element={<Meals />} />
                <Route path="daily-menu" element={<DailyMenu />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="deposits" element={<Deposits />} />
                <Route path="balance" element={<Balance />} />
                <Route path="stock" element={<Stocks />} />
                <Route path="extra-bills" element={<ExtraBills />} />
                <Route path="monthly-bills" element={<MonthlyBills />} />
                <Route path="reports" element={<Reports />} />
                <Route path="notices" element={<Notices />} />
                <Route path="chat" element={<Chat />} />
                <Route path="join-requests" element={<JoinRequests />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="bazar-schedule" element={<BazarSchedule />} />
                <Route path="feedback" element={<Feedback />} />
                <Route path="events" element={<Events />} />
                <Route path="ads" element={<Advertisements />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Boarder */}
              <Route
                path="/me"
                element={
                  <ProtectedRoute allow={["boarder"]}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MyDashboard />} />
                <Route path="chat" element={<Chat />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="daily-menu" element={<DailyMenu />} />
                <Route path="events" element={<Events />} />
                <Route path="feedback" element={<Feedback />} />
                <Route path="ads" element={<Advertisements />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Super admin (placeholder for now) */}
              <Route
                path="/super"
                element={
                  <ProtectedRoute allow={["super_admin"]}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<SuperMesses />} />
                <Route path="messes" element={<SuperMesses />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
