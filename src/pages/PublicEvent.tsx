import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialShare } from '@/components/SocialShare';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, MapPin, Download, ArrowLeft, Ticket, Clock, HelpCircle, Image as ImageIcon, CalendarPlus, Users, AlertCircle, Video, Instagram, Facebook, Twitter, Linkedin, Youtube, Globe, Award, CheckCircle2, Copy, IndianRupee } from 'lucide-react';
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
  const [event, setEvent] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [claimedTicket, setClaimedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SelectedTier | null>(null);
  const [hasTiers, setHasTiers] = useState(false);

  // Payment States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (error || !data) {
        toast.error('Event not found');
        navigate('/public-events');
        return;
      }

      setEvent(data);

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
          phone: pending.phone
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

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // NEW FLOW: Skip email verification - proceed directly based on event type
      // Email is validated by ticket delivery (if wrong email, no ticket received)

      if (event.is_free) {
        // Free Event: Create ticket immediately
        await createTicket();
      } else {
        // Paid Event: Show payment dialog
        setShowPaymentDialog(true);
        setLoading(false);
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

  const createTicket = async (paymentType: 'upi' | 'cash' = 'upi') => {
    try {
      setLoading(true);
      const ticketCode = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Determine status: Free = paid instantly, Paid events = pending (admin approves)
      let status = 'pending';
      let refId: string | null = null;

      if (event.is_free) {
        status = 'paid'; // Free tickets are always confirmed
      } else {
        // Both UPI and Cash start as pending - admin verifies later
        status = 'pending';
        refId = paymentType === 'upi' ? `UPI_${Date.now()}` : `CASH_${Date.now()}`;
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
          payment_status: status
        })
        .select()
        .single();

      if (error) throw error;

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
          : '✅ Ticket reserved! Pay cash at venue.';
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
    toast.info('To save your ticket, take a screenshot or use the share options below');
  };

  const handleAddToCalendar = () => {
    downloadICS(event);
    toast.success('Event added to your calendar!');
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/public-events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        {/* Event Details */}
        <Card className="mb-8 overflow-hidden border-2 border-primary/10">
          {event.image_url && (
            <div className="w-full h-64 md:h-80 overflow-hidden bg-muted">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              {format(new Date(event.event_date), 'PPP')}
            </CardDescription>
          </CardHeader>
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
        </Card>

        {/* Gallery */}
        {event.gallery_images && event.gallery_images.length > 0 && (
          <Card className="mb-8">
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
          </Card>
        )}

        {/* Videos */}
        {event.videos && event.videos.length > 0 && (
          <Card className="mb-8">
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
          </Card>
        )}

        {/* Schedule */}
        {event.schedule && event.schedule.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Event Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {event.schedule.map((item: any, index: number) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
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
          </Card>
        )}

        {/* FAQ */}
        {event.faq && event.faq.length > 0 && (
          <Card className="mb-8">
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
          </Card>
        )}

        {/* Sponsors */}
        {event.sponsors && event.sponsors.length > 0 && (
          <Card className="mb-8">
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
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow ${sponsor.websiteUrl ? 'cursor-pointer' : 'cursor-default'}`}
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
          </Card>
        )}

        {/* Additional Info */}
        {event.additional_info && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {event.additional_info}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Social Links */}
        {event.social_links && Object.values(event.social_links).some(Boolean) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Connect With Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {event.social_links.instagram && (
                  <a href={event.social_links.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity">
                    <Instagram className="w-5 h-5" /> Instagram
                  </a>
                )}
                {event.social_links.facebook && (
                  <a href={event.social_links.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:opacity-90 transition-opacity">
                    <Facebook className="w-5 h-5" /> Facebook
                  </a>
                )}
                {event.social_links.twitter && (
                  <a href={event.social_links.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white hover:opacity-90 transition-opacity">
                    <Twitter className="w-5 h-5" /> Twitter/X
                  </a>
                )}
                {event.social_links.linkedin && (
                  <a href={event.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white hover:opacity-90 transition-opacity">
                    <Linkedin className="w-5 h-5" /> LinkedIn
                  </a>
                )}
                {event.social_links.youtube && (
                  <a href={event.social_links.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition-opacity">
                    <Youtube className="w-5 h-5" /> YouTube
                  </a>
                )}
                {event.social_links.website && (
                  <a href={event.social_links.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground border border-border hover:bg-accent transition-colors">
                    <Globe className="w-5 h-5" /> Website
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Section */}
        {!claimedTicket ? (
          <div id="register" className="space-y-6">
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

            {(event.capacity && event.tickets_issued >= event.capacity) ? (
              <Alert variant="destructive" className="mb-8">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-lg font-semibold">
                  Sold Out
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="border-2 border-primary/20 shadow-lg shadow-primary/5">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Ticket className="w-6 h-6 text-primary" />
                    {event.is_free ? 'Register for Free' : 'Buy Ticket'}
                  </CardTitle>
                  <CardDescription>
                    Enter your details to book your spot.
                  </CardDescription>
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
                      />
                    )}

                    {!event.is_free && !hasTiers && (
                      <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                        <span className="font-medium">Standard Ticket</span>
                        <span className="text-xl font-bold text-primary">₹{event.ticket_price}</span>
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
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
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

        {/* Testimonials Section */}
        <div className="mt-12">
          <Testimonials />
          <ReviewSection eventId={eventId!} eventEnded={event ? new Date(event.event_date) < new Date() : false} />
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
                  {(bankDetails?.qr_code_url || event.payment_qr_image_url) && (
                    <div className="flex justify-center mb-3">
                      <div className="bg-white p-3 rounded-xl">
                        <img
                          src={bankDetails?.qr_code_url || event.payment_qr_image_url}
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
                    !bankDetails?.qr_code_url && !event.payment_qr_image_url && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-lg mb-3 text-center">
                        ⚠️ Organizer hasn't provided payment details. Please contact them directly.
                      </div>
                    )
                  )}

                  {/* Instruction */}
                  <p className="text-xs text-center text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    💡 Scan the QR code or copy the UPI ID to make payment. Your ticket will be generated and admin will verify.
                  </p>

                  <Button
                    onClick={() => createTicket('upi')}
                    disabled={loading}
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
                  disabled={loading}
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
