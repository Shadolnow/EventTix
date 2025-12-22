import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateEvent from "./pages/CreateEvent";
import Events from "./pages/Events";
import Scan from "./pages/Scan";
import Attendance from "./pages/Attendance";
import TicketManagement from "./pages/TicketManagement";
import TicketViewer from "./pages/TicketViewer";
import PublicEvent from "./pages/PublicEvent";
import PublicEvents from "./pages/PublicEvents";
import Dashboard from "./pages/Dashboard";
import AdminEvents from "./pages/AdminEvents";
import AdminDashboard from "./pages/AdminDashboard";
import EventCustomizationPage from "./pages/EventCustomizationPage";
import Pricing from "./pages/Pricing";
import BusinessSignup from "./pages/BusinessSignup";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import BusinessDashboard from "./pages/BusinessDashboard";
import BankAccounts from "./pages/BankAccounts";
import NotFound from "./pages/NotFound";
import AuthRoute from "@/components/RouteGuards/AuthRoute";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import MobileSettings from "./pages/MobileSettings";
import Analytics from "./pages/Analytics";
import GlobalTickets from "./pages/GlobalTickets";
import AllTicketsPage from "./pages/AllTicketsPage";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route path="/business-signup" element={<PageTransition><BusinessSignup /></PageTransition>} />
        <Route path="/e/:eventId" element={<PageTransition><PublicEvent /></PageTransition>} />
        <Route path="/public-events" element={<PageTransition><PublicEvents /></PageTransition>} />
        <Route path="/ticket/:ticketId" element={<PageTransition><TicketViewer /></PageTransition>} />

        {/* Protected Routes */}
        <Route path="/create-event" element={<AuthRoute><PageTransition><CreateEvent /></PageTransition></AuthRoute>} />
        <Route path="/events" element={<AuthRoute><PageTransition><Events /></PageTransition></AuthRoute>} />
        <Route path="/event/:eventId/tickets" element={<AuthRoute><PageTransition><TicketManagement /></PageTransition></AuthRoute>} />
        <Route path="/event/:eventId/customize" element={<AuthRoute><PageTransition><EventCustomizationPage /></PageTransition></AuthRoute>} />
        <Route path="/scan" element={<AuthRoute><PageTransition><Scan /></PageTransition></AuthRoute>} />
        <Route path="/attendance" element={<AuthRoute><PageTransition><Attendance /></PageTransition></AuthRoute>} />
        <Route path="/dashboard" element={<AuthRoute><PageTransition><Dashboard /></PageTransition></AuthRoute>} />
        <Route path="/business-dashboard" element={<AuthRoute><PageTransition><BusinessDashboard /></PageTransition></AuthRoute>} />
        <Route path="/bank-accounts" element={<AuthRoute><PageTransition><BankAccounts /></PageTransition></AuthRoute>} />
        <Route path="/admin" element={<AuthRoute><PageTransition><AdminDashboard /></PageTransition></AuthRoute>} />
        <Route path="/admin/events" element={<AuthRoute><PageTransition><AdminEvents /></PageTransition></AuthRoute>} />
        <Route path="/admin/subscriptions" element={<AuthRoute><PageTransition><AdminSubscriptions /></PageTransition></AuthRoute>} />
        <Route path="/mobile-settings" element={<AuthRoute><PageTransition><MobileSettings /></PageTransition></AuthRoute>} />
        <Route path="/analytics" element={<AuthRoute><PageTransition><Analytics /></PageTransition></AuthRoute>} />
        <Route path="/global-tickets" element={<AuthRoute><PageTransition><GlobalTickets /></PageTransition></AuthRoute>} />
        <Route path="/admin/tickets" element={<AuthRoute><PageTransition><AllTicketsPage /></PageTransition></AuthRoute>} />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-background text-foreground">
              <AnimatedRoutes />
              <MobileNavigation />
            </div>
          </BrowserRouter>
          <PWAInstallPrompt />
          <PWAUpdateNotification />
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
