import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
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
import EventCustomizationPage from "./pages/EventCustomizationPage";
import NotFound from "./pages/NotFound";
import AuthRoute from "@/components/RouteGuards/AuthRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/e/:eventId" element={<PublicEvent />} />
            <Route path="/public-events" element={<PublicEvents />} />
            <Route path="/ticket/:ticketId" element={<TicketViewer />} />
            
            {/* Protected Routes */}
            <Route path="/create-event" element={<AuthRoute><CreateEvent /></AuthRoute>} />
            <Route path="/events" element={<AuthRoute><Events /></AuthRoute>} />
            <Route path="/event/:eventId/tickets" element={<AuthRoute><TicketManagement /></AuthRoute>} />
            <Route path="/event/:eventId/customize" element={<AuthRoute><EventCustomizationPage /></AuthRoute>} />
            <Route path="/scan" element={<AuthRoute><Scan /></AuthRoute>} />
            <Route path="/attendance" element={<AuthRoute><Attendance /></AuthRoute>} />
            <Route path="/dashboard" element={<AuthRoute><Dashboard /></AuthRoute>} />
            <Route path="/admin/events" element={<AuthRoute><AdminEvents /></AuthRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
