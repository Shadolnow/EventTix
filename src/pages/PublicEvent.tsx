import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialShare } from '@/components/SocialShare';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, MapPin, Download, ArrowLeft, Ticket, Clock, HelpCircle, Image as ImageIcon, CalendarPlus, Users, AlertCircle, Video, Instagram, Facebook, Twitter, Linkedin, Youtube, Globe, Award, CheckCircle2, Copy, IndianRupee, Mail, Info } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { TicketCard } from '@/components/TicketCard';
import { TierSelector } from '@/components/TierSelector';
import { RazorpayCheckout } from '@/components/RazorpayCheckout';
import { downloadICS } from '@/utils/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SocialProofBanner, CountdownTimer } from '@/components/SocialProof';
import { TrustBadges, RefundPolicy, SecuritySection, Testimonials } from '@/components/TrustSignals';
import { CheckoutProgress } from '@/components/CheckoutProgress';
import { PromoCodeInput, PriceDisplay } from '@/components/PromoCode';
import { ReferralBanner } from '@/components/ReferralProgram';
import { sendTicketViaWhatsApp } from '@/utils/whatsapp';
import confetti from 'canvas-confetti';
import { ReviewSection } from '@/components/ReviewSection';
import { WaitlistForm } from '@/components/WaitlistForm';
import { useAuth } from '@/components/AuthProvider';
import { BulkTicketTab } from '@/components/BulkTicketTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpDialog } from '@/components/HelpDialog';
import { HowItWorks } from '@/components/HowItWorks';
import { PartyBackground, PartyHeader, PartyCard, PartyButton } from '@/components/PartyElements';

interface SelectedTier {
  id: string;
  name: string;
  price: number;
}

const claimSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().min(10, "Valid phone number required").max(20)
});

// Key for storing pending ticket data in localStorage
const PENDING_TICKET_KEY = 'pending_ticket_claim';

const PublicEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [claimedTicket, setClaimedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    securityPin: '', // Customer sets their own PIN
    upiRef: '' // UPI transaction reference
  });
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SelectedTier | null>(null);
  const [hasTiers, setHasTiers] = useState(false);
  const [ticketsSold, setTicketsSold] = useState(0);

  // Payment States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [upiTransactionRef, setUpiTransactionRef] = useState(""); // For payment dialog input

  // Magic Link Verification States
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);

  // Session storage key for pending booking
  const BOOKING_SESSION_KEY = `booking_${eventId}`;

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      console.log('Fetching event with ID:', eventId);

      // Use RPC function to bypass RLS issues
      const { data, error } = await supabase
        .rpc('get_event_details', { event_id: eventId });

      console.log('Event fetch result:', { data, error });

      if (error || !data || data.length === 0) {
        console.error('Event fetch error:', error);
        toast.error('Event not found');
        navigate('/public-events');
        return;
      }

      const eventData = data[0]; // RPC returns array
      console.log('Event loaded successfully:', eventData.title);
      setEvent(eventData);

      // Check if event has tiers
      const { data: tiers } = await supabase
        .from('ticket_tiers')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .limit(1);

      setHasTiers(tiers && tiers.length > 0);

      // Fetch Bank Details (UPI)
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_primary', true)
        .maybeSingle();

      if (bankData) {
        setBankDetails(bankData);
      }

      // Fetch Ticket Count
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      setTicketsSold(count || 0);
    };
    fetchEvent();
  }, [eventId, navigate]);

  // Check for magic link verification on page load
  useEffect(() => {
    const handleMagicLinkVerification = async () => {
      // Check if we have a pending ticket claim in localStorage
      const pendingData = localStorage.getItem(PENDING_TICKET_KEY);
      if (!pendingData) return;

      const pending = JSON.parse(pendingData);

      // Check if this is for the current event
      if (pending.eventId !== eventId) return;

      // Check if user is authenticated (magic link clicked)
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user?.email?.toLowerCase() === pending.email.toLowerCase()) {
        // Email verified! Restore form data and proceed
        setFormData({
          name: pending.name,
          email: pending.email,
          phone: pending.phone,
          securityPin: '',
          upiRef: ''
        });

        if (pending.tierId) {
          setSelectedTier({
            id: pending.tierId,
            name: pending.tierName,
            price: pending.tierPrice
          });
        }

        setIsEmailVerified(true);
        setShowOtpInput(false); // Hide "check email" UI if visible
        toast.success('Email verified successfully!');

        // Clear pending data
        localStorage.removeItem(PENDING_TICKET_KEY);

        // Sign out the temporary session (we don't need the user to stay logged in)
        await supabase.auth.signOut();

        // Proceed with ticket creation or payment
        if (pending.isFree) {
          // For free events, create ticket directly
          // We need to wait for event data to load
        } else {
          setShowPaymentDialog(true);
        }
      }
    };

    // Small delay to ensure event data is loaded
    const timer = setTimeout(handleMagicLinkVerification, 500);
    return () => clearTimeout(timer);
  }, [eventId, event]);

  // Auto-create ticket for free events after verification
  useEffect(() => {
    if (isEmailVerified && event?.is_free && formData.name && !claimedTicket) {
      createTicket(); // Use default online method for free tickets
    }
  }, [isEmailVerified, event, formData, claimedTicket]);

  // Send Magic Link for Email Verification
  const sendVerificationEmail = async () => {
    try {
      setLoading(true);

      // Validate form data first
      const validated = claimSchema.parse(formData);

      // Save booking data to sessionStorage
      const bookingData = {
        eventId,
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        securityPin: formData.securityPin,
        upiRef: formData.upiRef,
        tierId: selectedTier?.id || null,
        tierName: selectedTier?.name || null,
        tierPrice: selectedTier?.price || null,
        timestamp: Date.now()
      };

      sessionStorage.setItem(BOOKING_SESSION_KEY, JSON.stringify(bookingData));
      localStorage.setItem(PENDING_TICKET_KEY, JSON.stringify(bookingData));

      // Use production URL for magic link redirect
      const isProduction = window.location.hostname !== 'localhost';
      const baseUrl = isProduction
        ? 'https://eventtix-psi.vercel.app'
        : window.location.origin;
      const redirectUrl = `${baseUrl}/event/${eventId}?verified=true`;

      const { error } = await supabase.auth.signInWithOtp({
        email: validated.email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        }
      });

      if (error) throw error;

      // Show verification sent UI
      setVerificationSent(true);
      setVerificationEmail(validated.email);
      setPendingBookingData(bookingData);

      toast.success('Verification email sent!', {
        description: `Check ${validated.email} and click the link to complete your booking.`
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Verification error:', error);
        toast.error('Failed to send verification email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email verification is now OPTIONAL
    // Users can proceed without verification
    // Verification is still available but not required

    setLoading(true);

    try {
      const validated = claimSchema.parse(formData);

      if (event.capacity) {
        const { data: availabilityData } = await supabase
          .rpc('check_ticket_availability', { event_id_input: eventId });

        if (!availabilityData) {
          toast.error('Sorry, this event is sold out!');
          setLoading(false);
          return;
        }
      }

      // EMAIL VERIFICATION IS OPTIONAL
      // We don't block the flow, just log if they haven't verified
      if (!isEmailVerified && !verificationSent) {
        console.log("[VERIFICATION FLOW] User proceeding without email verification (optional)");
      }

      if (event.is_free) {
        // Free Event: Create ticket immediately
        console.log("[PAYMENT FLOW] Free event detected - creating ticket immediately");
        await createTicket();
      } else {
        // Paid Event: Show payment dialog
        console.log("[PAYMENT FLOW] Paid event detected - opening payment dialog");
        console.log("[PAYMENT FLOW] Event price:", event.ticket_price);
        console.log("[PAYMENT FLOW] Has QR:", !!event.qr_code_url);
        console.log("[PAYMENT FLOW] Has UPI ID:", !!event.upi_id);
        setShowPaymentDialog(true);
        setLoading(false);
        console.log("[PAYMENT FLOW] Payment dialog state set to true");
      }

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Something went wrong. Please try again.');
        console.error(error);
      }
      setLoading(false);
    }
  };

  const createTicket = async (paymentType: 'upi' | 'cash' = 'upi', providedUpiRef?: string) => {
    try {
      setLoading(true);

      // CRITICAL VALIDATION: UPI payments MUST have a reference
      if (paymentType === 'upi' && !event.is_free) {
        const activeUpiRef = providedUpiRef || formData.upiRef;
        if (!activeUpiRef || activeUpiRef.trim().length < 6) {
          toast.error('🚨 UPI Reference is REQUIRED (minimum 6 characters). Please enter your payment reference number.');
          setLoading(false);
          return;
        }
      }

      const ticketCode = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      let status: 'pending' | 'paid' = 'pending';
      let refId = '';

      //  Determine payment reference ID - use customer's UPI ref if provided
      if (event.is_free) {
        status = 'paid'; // Free tickets are always confirmed
      } else {
        // Both UPI and Cash start as pending - admin verifies later
        status = 'pending';
        // Use provided UPI reference (validated above) or CASH timestamp
        const activeUpiRef = providedUpiRef || formData.upiRef;
        refId = paymentType === 'upi'
          ? activeUpiRef.trim() // Must exist (validated above)
          : `CASH_${Date.now()}`;
      }

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          event_id: eventId,
          attendee_name: formData.name,
          attendee_phone: formData.phone,
          attendee_email: formData.email.toLowerCase(),
          ticket_code: ticketCode,
          tier_id: selectedTier?.id || null,
          payment_ref_id: refId,
          payment_status: status,
          payment_method: paymentType,
          security_pin: formData.securityPin // Add customer's PIN
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger Email Sending
      try {
        const emailResponse = await supabase.functions.invoke('send-ticket-email', {
          body: {
            to: formData.email,
            ticketCode: ticketCode,
            attendeeName: formData.name,
            eventTitle: event.title,
            eventDate: event.event_date,
            eventVenue: event.venue,
            ticketUrl: `${window.location.origin}/ticket/${ticket.id}`
          }
        });
        console.log("Email trigger response:", emailResponse);
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
        // Don't block success flow for email failure
      }

      // Send admin notification
      try {
        const organizerEmail = event.profiles?.email;
        if (organizerEmail) {
          const notifyResponse = await fetch(`${window.location.origin}/api/notify-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminEmail: organizerEmail,
              customerName: formData.name,
              customerEmail: formData.email,
              eventTitle: event.title,
              ticketType: selectedTier?.name || 'General Admission',
              quantity: 1,
              totalAmount: selectedTier?.price || 0,
              paymentMethod: paymentType
            })
          });

          if (notifyResponse.ok) {
            console.log('✅ Admin notification sent');
          } else {
            console.error('Admin notification failed:', await notifyResponse.text());
          }
        }
      } catch (notifyErr) {
        console.error("Failed to notify admin:", notifyErr);
        // Don't block success flow
      }

      // Set the claimed ticket to show success UI
      setClaimedTicket({ ...ticket, events: event, tier_name: selectedTier?.name });
      setShowPaymentDialog(false);

      // Trigger Confetti Celebration!
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999
      };

      function fire(particleRatio: number, opts: any) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#00E5FF', '#B400FF', '#FFFFFF']
      });

      fire(0.2, {
        spread: 60,
        colors: ['#00E5FF', '#B400FF', '#FFFFFF']
      });

      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#00E5FF', '#B400FF', '#FFFFFF']
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ['#00E5FF', '#B400FF', '#FFFFFF']
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: ['#00E5FF', '#B400FF', '#FFFFFF']
      });

      // Success message based on type
      const successMsg = event.is_free
        ? '🎉 Ticket claimed successfully!'
        : paymentType === 'upi'
          ? '✅ Ticket generated! Payment verification pending.'
          : '✅ Ticket reserved! Call 7507066880 to complete payment and download your ticket.';
      toast.success(successMsg);

      // WhatsApp Link with ticket details
      const ticketUrl = `${window.location.origin}/ticket/${ticket.id}`;
      const paymentNote = event.is_free
        ? ''
        : paymentType === 'upi'
          ? '\n💳 Payment Status: Pending Verification'
          : '\n💵 Payment: Cash at Venue';
      const message = `🎫 *Ticket Booked!*\n\nEvent: ${event.title}\nDate: ${format(new Date(event.event_date), 'PPP')}\nVenue: ${event.venue}\nCode: ${ticketCode}${paymentNote}\n\n🔗 View Ticket: ${ticketUrl}`;

      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(message)}`;
        // Small delay to show success state first
        setTimeout(() => window.open(whatsappUrl, '_blank'), 1000);
      }

    } catch (error: any) {
      console.error("Claim Error:", error);
      toast.error('Failed to generate ticket: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Open print dialog which allows "Save as PDF" on mobile/desktop
    window.print();
    toast.success('Save as PDF to keep your ticket safe!');
  };

  const handleAddToCalendar = () => {
    downloadICS(event);
    toast.success('Event added to your calendar!');
  };

  // Helper function to format social media URLs
  const formatSocialUrl = (platform: string, value: string): string => {
    if (!value) return '';

    // If already a full URL, return as is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // Remove @ symbol if present
    const username = value.replace('@', '');

    // Format based on platform
    switch (platform.toLowerCase()) {
      case 'instagram':
        return `https://instagram.com/${username}`;
      case 'facebook':
        return `https://facebook.com/${username}`;
      case 'twitter':
        return `https://twitter.com/${username}`;
      case 'linkedin':
        return `https://linkedin.com/in/${username}`;
      case 'youtube':
        return `https://youtube.com/@${username}`;
      default:
        return value;
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading event...</div>
      </div>
    );
  }

  const ticketPrice = selectedTier ? selectedTier.price : (event.ticket_price || 0);

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <PartyBackground />
      <div className="container mx-auto max-w-4xl relative z-10">
        <Button variant="ghost" onClick={() => navigate('/public-events')} className="mb-6 hover:bg-white/10 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        {/* Event Details */}
        <PartyCard className="mb-8 group">
          {event.image_url && (
            <div className="w-full h-64 md:h-96 overflow-hidden bg-muted relative">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
            </div>
          )}

          <div className="pt-8 pb-4 px-6">
            <PartyHeader
              title={event.title}
              subtitle={format(new Date(event.event_date), 'PPP p')}
            />
          </div>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {event.venue}
                </a>
              </div>
              {event.capacity && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  <span>{event.tickets_issued} / {event.capacity} joined</span>
                </div>
              )}
            </div>

            {event.capacity && event.tickets_issued >= event.capacity && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This event is sold out. No more tickets available.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleAddToCalendar} size="sm">
                <CalendarPlus className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            </div>

            {event.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
            )}

            {event.promotion_text && (
              <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-4">
                <p className="text-primary font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {event.promotion_text}
                </p>
              </div>
            )}
          </CardContent>
        </PartyCard>

        {/* Registration Section - MOVED UP for better conversion */}
        {!claimedTicket ? (
          <div id="register" className="space-y-6 mb-8">
            {/* Social Proof Banner */}
            <SocialProofBanner
              eventId={eventId!}
              capacity={event.capacity}
              ticketsIssued={event.tickets_issued}
            />

            {/* Early Bird Countdown (if applicable - show for 7 days before event) */}
            {new Date(event.event_date).getTime() - new Date().getTime() > 7 * 24 * 60 * 60 * 1000 && (
              <CountdownTimer
                deadline={new Date(new Date(event.event_date).getTime() - 7 * 24 * 60 * 60 * 1000)}
                label="🎟️ Early Bird Pricing Ends In"
              />
            )}

            {(event.capacity && ticketsSold >= event.capacity) ? (
              <WaitlistForm eventId={eventId!} />
            ) : (
              <>
                <Tabs defaultValue="single" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="single">🎫 Single Ticket</TabsTrigger>
                    <TabsTrigger value="bulk">🎟️ Bulk Tickets</TabsTrigger>
                  </TabsList>

                  {/* Single Ticket Tab */}
                  <TabsContent value="single">
                    <PartyCard className="border-2 border-primary/20 shadow-lg shadow-primary/5">
                      <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                          <Ticket className="w-6 h-6 text-primary" />
                          {event.is_free ? 'Register for Free' : 'Buy Ticket'}
                        </CardTitle>
                        <CardDescription>
                          Enter your details to book your spot.
                        </CardDescription>

                        {/* Help Button for Single Ticket */}
                        <div className="mt-4">
                          <HelpDialog
                            title="How to Buy a Single Ticket"
                            description="Quick guide to purchase your event ticket"
                            variant="inline"
                            buttonText="Need help with ticket purchase?"
                            sections={[
                              {
                                heading: "Fill Your Details",
                                content: "Provide your information to register for the event",
                                steps: [
                                  "Enter your Full Name",
                                  "Provide a valid Email (ticket will be sent here)",
                                  "Add your Phone number (WhatsApp preferred)",
                                  "Create a 4-6 digit Security PIN (you choose it!)"
                                ]
                              },
                              {
                                heading: "Payment (For Paid Events)",
                                content: "Complete your payment securely",
                                steps: [
                                  "Click 'Proceed to Payment'",
                                  "Scan the UPI QR code with any UPI app",
                                  "Complete the payment",
                                  "Copy and paste your UPI transaction ID",
                                  "Click 'I've Paid' to generate your ticket"
                                ]
                              },
                              {
                                heading: "Retrieve Your Ticket Later",
                                content: "Access your ticket anytime from 'My Tickets' page using:",
                                steps: [
                                  "Your Email address",
                                  "Your Phone number",
                                  "Your Security PIN",
                                  "All three are required for security"
                                ]
                              }
                            ]}
                          />
                        </div>

                        {/* Checkout Progress Indicator */}
                        <CheckoutProgress
                          currentStep={claimedTicket ? 'confirm' : 'details'}
                        />
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleClaim} className="space-y-4">
                          {hasTiers && (
                            <TierSelector
                              eventId={eventId!}
                              isFreeEvent={event.is_free}
                              selectedTierId={selectedTier?.id || null}
                              onSelect={(tier) => setSelectedTier(tier ? { id: tier.id, name: tier.name, price: tier.price } : null)}
                              discountPercent={event.discount_percent || 0}
                            />
                          )}

                          {!event.is_free && !hasTiers && (
                            <div className="p-4 bg-muted rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Standard Ticket</span>
                                <div className="text-right">
                                  {event.discount_percent > 0 && (
                                    <div className="text-xs text-muted-foreground line-through mb-1">
                                      ₹{event.ticket_price}
                                    </div>
                                  )}
                                  <span className="text-xl font-bold text-primary">
                                    ₹{event.discount_percent > 0
                                      ? Math.round(event.ticket_price * (1 - event.discount_percent / 100))
                                      : event.ticket_price
                                    }
                                  </span>
                                  {event.discount_percent > 0 && (
                                    <div className="text-xs text-green-600 font-semibold mt-1">
                                      {event.discount_percent}% OFF
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Full Name</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="John Doe"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone (WhatsApp)</Label>
                              <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                                placeholder="+91 9876543210"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              required
                              placeholder="john@example.com"
                            />
                            <p className="text-xs text-muted-foreground">We'll send your ticket to this email.</p>
                          </div>

                          {/* Security PIN Field - Matches Bulk Ticket */}
                          <div className="space-y-2">
                            <Label htmlFor="security-pin" className="text-primary font-semibold">
                              🔒 Security PIN (4-6 digits) *
                            </Label>
                            <Input
                              id="security-pin"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="Enter your 4-6 digit PIN"
                              value={formData.securityPin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, ''); // Only digits
                                setFormData({ ...formData, securityPin: value });
                              }}
                              className="text-center text-2xl tracking-widest font-bold"
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              ⚠️ <strong>Important:</strong> You'll need this PIN + email + phone to retrieve your ticket later
                            </p>
                          </div>

                          {/* Optional Email Verification */}
                          <div className="space-y-2">
                            {!isEmailVerified ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  sendVerificationEmail();
                                }}
                                disabled={!formData.email || verificationSent}
                                className="w-full border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                {verificationSent
                                  ? "✓ Verification Email Sent - Check Your Inbox"
                                  : "✉️ Verify Email (Optional but Recommended)"}
                              </Button>
                            ) : (
                              <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border-2 border-green-500/50 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                                  Email Verified! ✓
                                </span>
                              </div>
                            )}
                            {!isEmailVerified && !verificationSent && (
                              <p className="text-xs text-muted-foreground text-center">
                                💡 Verifying helps us provide faster support if needed
                              </p>
                            )}
                          </div>

                          {/* Email Verification Status */}
                          {verificationSent && !isEmailVerified && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-500/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    ✉️ Verification Email Sent!
                                  </h4>
                                  <p className="text-sm text-blue-800 dark:text-blue-200">
                                    We've sent a magic link to <strong>{verificationEmail}</strong>
                                  </p>
                                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                    Click the link in your email to verify and complete your booking.
                                  </p>
                                  <Button
                                    variant="link"
                                    className="text-xs text-blue-600 dark:text-blue-400 p-0 h-auto mt-2 underline"
                                    onClick={() => setIsEmailVerified(true)}
                                  >
                                    Already verified? or skip verification
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {isEmailVerified && (
                            <div className="p-3 bg-green-50 dark:bg-green-950/30 border-2 border-green-500/50 rounded-lg flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                                ✓ Email Verified! You can now complete your booking.
                              </span>
                            </div>
                          )}

                          <Button
                            type="submit"
                            className="w-full btn-mobile-primary relative overflow-hidden group bg-gradient-to-r from-primary to-accent"
                            disabled={loading || (hasTiers && !selectedTier)}
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {loading ? 'Processing...' : (
                                <>
                                  {event.is_free ? '🎫 Get My Free Ticket' : '💳 Proceed to Payment'} <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </>
                              )}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          </Button>
                        </form>
                      </CardContent>
                    </PartyCard>
                  </TabsContent>

                  {/* Bulk Ticket Tab */}
                  <TabsContent value="bulk">
                    <BulkTicketTab
                      eventId={eventId!}
                      event={event}
                      onSuccess={(tickets) => {
                        if (tickets.length > 0) {
                          setClaimedTicket({
                            ...tickets[0],
                            events: event
                          });
                        }
                      }}
                    />
                  </TabsContent>
                </Tabs>

                {/* Payment Dialog for Single Tickets */}
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Complete Your Payment</DialogTitle>
                      <DialogDescription>
                        Scan the QR code or use UPI ID to make payment
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Amount Display */}
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-3xl font-bold text-primary">
                          ₹{selectedTier ? selectedTier.price : event.ticket_price}
                        </p>
                      </div>

                      {/* QR Code */}
                      {event.qr_code_url && (
                        <div className="flex justify-center">
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 blur-xl rounded-2xl" />
                            <img
                              src={event.qr_code_url}
                              alt="UPI QR Code"
                              className="relative w-64 h-64 object-contain rounded-2xl border-2 border-border bg-white p-4"
                            />
                          </div>
                        </div>
                      )}

                      {/* UPI ID */}
                      {event.upi_id && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Or pay using UPI ID</Label>
                          <div className="flex gap-2">
                            <Input
                              value={event.upi_id}
                              readOnly
                              className="font-mono text-base"
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(event.upi_id);
                                toast.success('UPI ID copied!');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Payment Instructions */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <p className="font-semibold text-sm">Payment Steps:</p>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                            <span>Open any UPI app (GPay, PhonePe, Paytm, etc.)</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                            <span>Scan the QR code or enter the UPI ID</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                            <span>Complete the payment</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                            <span><strong>Copy your UPI transaction ID</strong> and paste it below</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">5</span>
                            <span>Click "I've Paid" to generate your ticket</span>
                          </div>
                        </div>
                      </div>

                      {/* UPI Reference Input */}
                      <div className="space-y-2">
                        <Label htmlFor="upi-transaction-ref" className="text-sm font-semibold">
                          UPI Transaction Reference (Optional but Recommended)
                        </Label>
                        <Input
                          id="upi-transaction-ref"
                          type="text"
                          placeholder="e.g., 434512345678 or UPI/CR/..."
                          value={upiTransactionRef}
                          onChange={(e) => setUpiTransactionRef(e.target.value)}
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          💡 <strong>Enter your UPI transaction ID</strong> for faster verification. Find it in your payment app after completing payment.
                        </p>
                      </div>

                      {/* Confirm Button */}
                      <Button
                        onClick={async () => {
                          // Update formData with UPI reference (for state consistency)
                          setFormData({ ...formData, upiRef: upiTransactionRef });
                          // Close dialog
                          setShowPaymentDialog(false);
                          // Create ticket with the current input value directly to avoid stale state issues
                          await createTicket('upi', upiTransactionRef);
                        }}
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        {loading ? 'Creating Ticket...' : '✅ I\'ve Paid - Create Ticket'}
                      </Button>

                      {/* Contact Info */}
                      <p className="text-xs text-center text-muted-foreground">
                        💡 Call <span className="font-semibold text-primary">7507066880</span> to confirm or wait for verification
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            <Alert className={`bg-${claimedTicket.payment_status === 'pay_at_venue' ? 'yellow' : 'green'}-500/10 border-${claimedTicket.payment_status === 'pay_at_venue' ? 'yellow' : 'green'}-500/20 text-${claimedTicket.payment_status === 'pay_at_venue' ? 'yellow' : 'green'}-500`}>
              <CheckCircle2 className="h-4 w-4" />
              <div className="space-y-1">
                <AlertDescription className="font-medium">
                  {claimedTicket.payment_status === 'pay_at_venue'
                    ? 'Token Generated! Show this at the venue to pay and enter.'
                    : 'Success! Your ticket has been generated.'}
                </AlertDescription>
                {claimedTicket.payment_status === 'pay_at_venue' && (
                  <p className="text-sm opacity-90">
                    Payments need to made within 24 hours of booking post which the tickets get cancelled.
                    You can call at <strong>7507066880</strong> if you want to confirm on Phone.
                  </p>
                )}
              </div>
            </Alert>
            <TicketCard ticket={claimedTicket} />
            <div className="flex justify-center">
              <Button onClick={() => window.print()} variant="outline">Print / Save as PDF</Button>
            </div>
          </div>
        )}

        {/* How It Works Section - MOVED UP */}
        <div className="my-8">
          <HowItWorks isFreeEvent={event.is_free} />
        </div>

        {/* Gallery */}
        {event.gallery_images && event.gallery_images.length > 0 && (
          <PartyCard className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Event Gallery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {event.gallery_images.map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border-2 border-border hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            </CardContent>
          </PartyCard>
        )}

        {/* Videos */}
        {event.videos && event.videos.length > 0 && (
          <PartyCard className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Event Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {event.videos.map((url: string, index: number) => (
                  <div key={index} className="aspect-video rounded-lg overflow-hidden border-2 border-border">
                    <iframe
                      src={url}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Event video ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </PartyCard>
        )}

        {/* Schedule */}
        {event.schedule && event.schedule.length > 0 && (
          <PartyCard className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Event Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {event.schedule.map((item: any, index: number) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg bg-white/50 backdrop-blur-sm">
                    <div className="text-primary font-bold min-w-[80px]">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </PartyCard>
        )}

        {/* FAQ */}
        {event.faq && event.faq.length > 0 && (
          <PartyCard className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {event.faq.map((item: any, index: number) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </PartyCard>
        )}

        {/* Sponsors */}
        {event.sponsors && event.sponsors.length > 0 && (
          <PartyCard className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Our Sponsors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {event.sponsors.map((sponsor: any, index: number) => (
                  <a
                    key={index}
                    href={sponsor.websiteUrl || '#'}
                    target={sponsor.websiteUrl ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow ${sponsor.websiteUrl ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      className="h-16 w-auto max-w-full object-contain"
                    />
                    <span className="text-sm font-medium text-center">{sponsor.name}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </PartyCard>
        )}

        {/* Additional Info */}
        {event.additional_info && (
          <PartyCard className="mb-8">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {event.additional_info}
              </p>
            </CardContent>
          </PartyCard>
        )}

        {/* Social Links */}
        {event.social_links && Object.values(event.social_links).some(Boolean) && (
          <PartyCard className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Connect With Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {event.social_links.instagram && (
                  <a href={formatSocialUrl('instagram', event.social_links.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity">
                    <Instagram className="w-5 h-5" /> Instagram
                  </a>
                )}
                {event.social_links.facebook && (
                  <a href={formatSocialUrl('facebook', event.social_links.facebook)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:opacity-90 transition-opacity">
                    <Facebook className="w-5 h-5" /> Facebook
                  </a>
                )}
                {event.social_links.twitter && (
                  <a href={formatSocialUrl('twitter', event.social_links.twitter)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white hover:opacity-90 transition-opacity">
                    <Twitter className="w-5 h-5" /> Twitter/X
                  </a>
                )}
                {event.social_links.linkedin && (
                  <a href={formatSocialUrl('linkedin', event.social_links.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white hover:opacity-90 transition-opacity">
                    <Linkedin className="w-5 h-5" /> LinkedIn
                  </a>
                )}
                {event.social_links.youtube && (
                  <a href={formatSocialUrl('youtube', event.social_links.youtube)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition-opacity">
                    <Youtube className="w-5 h-5" /> YouTube
                  </a>
                )}
                {event.social_links.website && (
                  <a href={formatSocialUrl('website', event.social_links.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white hover:opacity-90 transition-opacity">
                    <Globe className="w-5 h-5" /> Website
                  </a>
                )}
              </div>
            </CardContent>
          </PartyCard>
        )}


        {/* Testimonials Section */}
        <div className="mt-12">
          <Testimonials />
          <ReviewSection
            eventId={eventId!}
            eventEnded={event ? new Date(event.event_date) < new Date() : false}
            isOrganizer={user?.id === event?.user_id}
          />
        </div>

        {/* Refund Policy Section */}
        <div className="mt-8">
          <RefundPolicy />
        </div>

        {/* Payment Dialog - UPI & Cash Only */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl flex items-center gap-2">
                💳 Complete Payment
              </DialogTitle>
              <DialogDescription>
                Pay ₹{ticketPrice} for {selectedTier?.name || 'Standard'} ticket
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Event</span>
                  <span className="font-medium">{event.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ticket Type</span>
                  <span>{selectedTier?.name || 'Standard'}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">₹{ticketPrice}</span>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="border-t pt-4">
                <PromoCodeInput
                  eventId={eventId!}
                  originalPrice={ticketPrice}
                  onApply={(discount) => {
                    // Store discount info for ticket creation
                    toast.success(`Discount applied! You pay ₹${discount.finalPrice}`);
                  }}
                  onRemove={() => {
                    // Reset to original price
                  }}
                />
              </div>

              {/* Payment Options */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-center text-muted-foreground">
                  Choose Payment Method
                </p>

                {/* UPI Payment Option */}
                <div className="p-4 border-2 border-primary/30 rounded-xl bg-primary/5 hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.5 13.5L14.5 9.5L13.09 8.09L10.5 10.67L8.91 9.09L7.5 10.5L10.5 13.5ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold">UPI Payment</p>
                      <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm, BHIM</p>
                    </div>
                  </div>

                  {/* UPI QR Code */}
                  {(bankDetails?.qr_code_url || event.qr_code_url) && (
                    <div className="flex justify-center mb-3">
                      <div className="bg-white p-3 rounded-xl">
                        <img
                          src={bankDetails?.qr_code_url || event.qr_code_url}
                          alt="UPI QR Code"
                          className="w-40 h-40 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* UPI ID */}
                  {(bankDetails?.upi_id || event.upi_id) ? (
                    <div className="mb-3">
                      <p className="text-xs text-center text-muted-foreground mb-1">Or pay to UPI ID</p>
                      <button
                        onClick={() => {
                          const id = bankDetails?.upi_id || event.upi_id;
                          navigator.clipboard.writeText(id);
                          toast.success('UPI ID copied!');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
                      >
                        <code className="font-mono text-sm font-medium text-primary">{bankDetails?.upi_id || event.upi_id}</code>
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    !bankDetails?.qr_code_url && !event.qr_code_url && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-lg mb-3 text-center">
                        ⚠️ Organizer hasn't provided payment details. Please contact them directly.
                      </div>
                    )
                  )}

                  {/* Instruction */}
                  <p className="text-xs text-center text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    💡 Scan the QR code or copy the UPI ID to make payment. Your ticket will be generated and admin will verify.
                  </p>

                  {/* UPI Reference Input - CRITICAL */}
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="upiRef" className="text-sm font-medium flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      UPI Transaction Reference / UTR Number
                    </Label>
                    <Input
                      id="upiRef"
                      placeholder="Enter 12-digit UTR/Ref number (e.g., 123456789012)"
                      value={formData.upiRef || ''}
                      onChange={(e) => setFormData({ ...formData, upiRef: e.target.value })}
                      className="font-mono text-center"
                      maxLength={20}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      📱 Find this in your payment app after completing the UPI payment
                    </p>
                  </div>

                  <Button
                    onClick={() => createTicket('upi')}
                    disabled={loading || (hasTiers && !selectedTier)}
                    className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 min-h-[48px]"
                  >
                    {loading ? 'Processing...' : '✅ I have made UPI Payment'}
                  </Button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Cash at Venue Option */}
                <button
                  onClick={() => createTicket('cash')}
                  disabled={loading || (hasTiers && !selectedTier)}
                  className="w-full p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold group-hover:text-primary transition-colors">Pay Cash at Venue</p>
                    <p className="text-xs text-muted-foreground">Reserve now, pay when you arrive</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 rotate-180 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Instant Ticket</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>WhatsApp Delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default PublicEvent;
