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
import { lazy, Suspense } from "react";
import AuthRoute from "@/components/RouteGuards/AuthRoute";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import { ParticleBackground } from "@/components/ui/ParticleBackground";
import { Sparkles } from "lucide-react";

// Lazy Load Pages for Performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const Events = lazy(() => import("./pages/Events"));
const Scan = lazy(() => import("./pages/Scan"));
const Attendance = lazy(() => import("./pages/Attendance"));
const TicketManagement = lazy(() => import("./pages/TicketManagement"));
const TicketViewer = lazy(() => import("./pages/TicketViewer"));
const PublicEvent = lazy(() => import("./pages/PublicEvent"));
const PublicEvents = lazy(() => import("./pages/PublicEvents"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminEvents = lazy(() => import("./pages/AdminEvents"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const EventCustomizationPage = lazy(() => import("./pages/EventCustomizationPage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const BusinessSignup = lazy(() => import("./pages/BusinessSignup"));
const AdminSubscriptions = lazy(() => import("./pages/AdminSubscriptions"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const BankAccounts = lazy(() => import("./pages/BankAccounts"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MobileSettings = lazy(() => import("./pages/MobileSettings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const GlobalTickets = lazy(() => import("./pages/GlobalTickets"));
const AllTicketsPage = lazy(() => import("./pages/AllTicketsPage"));
const DoorStaffScanner = lazy(() => import("./pages/DoorStaffScanner"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const TicketArchive = lazy(() => import("./pages/TicketArchive"));
const ScannerTest = lazy(() => import("./pages/ScannerTest"));
const CameraDebug = lazy(() => import("./pages/CameraDebug"));
const GateScanner = lazy(() => import("./pages/GateScanner"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4 animate-in fade-in-50 duration-300">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-pulse" />
      </div>
    </div>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/business-signup" element={<PageTransition><BusinessSignup /></PageTransition>} />
          <Route path="/e/:eventId" element={<PageTransition><PublicEvent /></PageTransition>} />
          <Route path="/public-events" element={<PageTransition><PublicEvents /></PageTransition>} />
          <Route path="/ticket/:ticketId" element={<PageTransition><TicketViewer /></PageTransition>} />
          <Route path="/my-tickets" element={<PageTransition><MyTickets /></PageTransition>} />

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
          <Route path="/admin/archive" element={<AuthRoute><PageTransition><TicketArchive /></PageTransition></AuthRoute>} />
          <Route path="/scanner/:eventId" element={<PageTransition><DoorStaffScanner /></PageTransition>} />
          <Route path="/gate/:eventId" element={<PageTransition><GateScanner /></PageTransition>} />
          <Route path="/scanner-test" element={<PageTransition><ScannerTest /></PageTransition>} />
          <Route path="/camera-debug" element={<PageTransition><CameraDebug /></PageTransition>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

import { CookieConsent } from "@/components/CookieConsent";
import { TicketNotificationListener } from "@/components/Notifications/TicketNotificationListener";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" richColors closeButton />
          <CookieConsent />
          <BrowserRouter>
            <TicketNotificationListener />
            <ParticleBackground />
            <div className="min-h-screen flex flex-col relative z-10 text-foreground">
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
