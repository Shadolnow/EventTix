
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TicketCard } from '@/components/TicketCard';
import { AttendeeList } from '@/components/AttendeeList';
import { EventStats } from '@/components/EventStats';
import { EventCustomization } from '@/components/EventCustomization';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { ArrowLeft, Plus, Ticket as TicketIcon, Users, Settings, Printer, Download, Share2, CreditCard, CheckCircle2, AlertCircle, ScanLine, Clock, Trash2, Archive, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WaitlistManager } from '@/components/WaitlistManager';
import { BulkDeleteDialog } from '@/components/BulkDeleteDialog';
import { DoorStaffManager } from '@/components/DoorStaffManager';
import { ModeToggle } from '@/components/mode-toggle';
import { LanguageSelector } from '@/components/LanguageSelector';

const attendeeSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  email: z.string().trim().email({ message: 'Invalid email address' }).max(255),
  phone: z.string().trim().min(10, { message: 'Phone number must be at least 10 digits' }).max(15)
});

const TicketManagement = () => {
  const { eventId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [isBankSaving, setIsBankSaving] = useState(false);
  const [bankForm, setBankForm] = useState({
    account_holder_name: '',
    upi_id: '',
    qr_code_url: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    securityPin: '', // Customer sets their own PIN
    paymentRef: '', // Payment reference (UPI/Cash)
    tierId: '' // Ticket Tier selection
  });

  // Bulk Delete States
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [tiers, setTiers] = useState<any[]>([]);

  useEffect(() => {
    if (searchParams.get('openGenerate') === 'true') {
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !eventId) return;

    const fetchEventAndTickets = async () => {
      // Housekeeping: Expire old tickets
      await (supabase as any).rpc('expire_unpaid_tickets');

      // Fetch event
      const { data: eventData, error: eventError } = await (supabase as any)
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('user_id', user.id)
        .single();

      if (eventError || !eventData) {
        toast.error('Event not found or access denied');
        navigate('/events');
        return;
      }

      setEvent(eventData);

      // Fetch tickets with tier info
      const { data: ticketsData } = await (supabase as any)
        .from('tickets')
        .select('*, events(*), ticket_tiers(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (ticketsData) setTickets(ticketsData);

      // Fetch Tiers for capacity bars
      const { data: tiersData } = await (supabase as any)
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (tiersData) setTiers(tiersData);

      // Fetch Bank Account
      const { data: bankData } = await (supabase as any)
        .from('bank_accounts')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_primary', true)
        .maybeSingle();

      if (bankData) {
        setBankAccount(bankData);
        setBankForm({
          account_holder_name: bankData.account_holder_name || '',
          upi_id: bankData.upi_id || '',
          qr_code_url: bankData.qr_code_url || ''
        });
      }
    };

    fetchEventAndTickets();

    // Subscribe to ticket changes
    const channel = supabase
      .channel('ticket-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `event_id = eq.${eventId} `
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchEventAndTickets();
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev =>
              prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, eventId, navigate]);



  // State to hold and display the newly generated ticket
  const [newlyGeneratedTicket, setNewlyGeneratedTicket] = useState<any>(null);

  const downloadTicketImage = async () => {
    const ticketElement = document.getElementById('new-ticket-card');
    if (!ticketElement) return;


    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(ticketElement, {
        backgroundColor: '#030712', // Force strict dark background (Tailwind gray-950)
        scale: 3, // Higher resolution
        useCORS: true, // For external images (if any)
        logging: false
      });

      const link = document.createElement('a');
      link.download = `Ticket-${newlyGeneratedTicket.ticket_code}.png`;
      link.href = canvas.toDataURL('image/png', 1.0); // Max quality
      link.click();
      toast.success('Ticket image downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download ticket image');
    }
  };

  const printTicket = () => {
    const printContent = document.getElementById('new-ticket-card');
    if (!printContent) return;

    // Create a hidden print window/iframe or just simple window.print methodology 
    // Usually simpler to open a new window for clean print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
            <head>
            <title>Print Ticket</title>
            <style>
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; color: #000; }
                #ticket-container { transform: scale(1); }
            </style>
            </head>
            <body>
            <div id="ticket-container">${printContent.outerHTML}</div>
            <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 500);
            </script>
            </body>
        </html>
        `);
      printWindow.document.close();
    }
  };

  const shareTicket = async () => {
    if (!newlyGeneratedTicket) return;
    const ticketUrl = `${window.location.origin} /ticket/${newlyGeneratedTicket.id} `;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket for ${event.title}`,
          text: `Here is your ticket for ${event.title} at ${event.venue}.`,
          url: ticketUrl
        });
        toast.success('Ticket shared successfully');
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      await navigator.clipboard.writeText(ticketUrl);
      toast.success('Ticket URL copied to clipboard');
    }
  };

  // Modify existing generateTicket to update state instead of closing dialog
  /* Override the generateTicket function logic part */
  // NOTE: You will need to replace the original function completely or edit specifically. 
  // Since I am providing a complete block replacement, I will rewrite generateTicket slightly to set state.

  const handleGenerateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = attendeeSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Validate Security PIN
    if (!formData.securityPin || formData.securityPin.length < 4 || formData.securityPin.length > 6) {
      toast.error('Security PIN must be 4-6 digits');
      return;
    }

    if (!formData.tierId) {
      toast.error('Please select a ticket tier');
      return;
    }

    setIsLoading(true);
    try {
      const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      };

      const section1 = generateId().replace(/-/g, '').substring(0, 8).toUpperCase();
      const section2 = generateId().replace(/-/g, '').substring(0, 8).toUpperCase();
      const ticketCode = `${section1}-${section2}`;

      const { data: ticketData, error } = await (supabase as any).from('tickets').insert({
        event_id: eventId,
        ticket_code: ticketCode,
        attendee_name: formData.name,
        attendee_email: formData.email,
        attendee_phone: formData.phone,
        payment_status: 'paid', // Admin generated = Assumed Paid/Comp
        security_pin: formData.securityPin, // Add customer's PIN
        payment_ref_id: formData.paymentRef.trim() || `MANUAL_${ticketCode}`, // Use provided ref or generate
        ticket_tier_id: formData.tierId
      }).select("*, ticket_tiers(*)").single();

      if (error) throw error;

      // Construct ticket object for display (mimicking needed structure for TicketCard)
      const paymentRefId = `MANUAL_${ticketCode}`;
      const fullTicket = {
        ...ticketData,
        payment_ref_id: paymentRefId, // Manually attach for display
        events: event // Event Data is available in parent scope
      };

      setNewlyGeneratedTicket(fullTicket);

      // Async email sending (don't await strictly to block UI if not needed, but good to wait for confirmation)
      fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          ticketCode: ticketCode,
          eventTitle: event.title,
          eventDate: new Date(event.event_date).toLocaleDateString(),
          venue: event.venue,
          ticketId: ticketData.id,
          attendeeName: formData.name,
          paymentRefId: paymentRefId // Send to email
        })
      }).catch(err => console.error("Email send warning:", err));

      toast.success('Ticket generated successfully');

      // Display customer's chosen Security PIN
      toast.success(`🔒 Your Security PIN: ${formData.securityPin}`, {
        description: 'SAVE THIS! You chose this PIN - need it with email & phone to retrieve tickets',
        duration: 15000, // 15 seconds
        action: {
          label: 'Copy PIN',
          onClick: () => {
            navigator.clipboard.writeText(formData.securityPin);
            toast.success('PIN copied to clipboard!');
          }
        }
      });

      // Do NOT close dialog, instead show success view
    } catch (error: any) {
      console.error('Generate ticket error:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !eventId) return;
    setIsBankSaving(true);

    try {
      const payload = {
        user_id: user.id,
        event_id: eventId,
        is_primary: true,
        account_holder_name: bankForm.account_holder_name,
        upi_id: bankForm.upi_id,
        qr_code_url: bankForm.qr_code_url,
        bank_name: 'UPI', // Default for UPI-first flow
        account_number: 'N/A',
        ifsc_code: 'N/A'
      };

      if (bankAccount) {
        // Update
        const { error } = await (supabase as any)
          .from('bank_accounts')
          .update(payload)
          .eq('id', bankAccount.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await (supabase as any)
          .from('bank_accounts')
          .insert(payload);
        if (error) throw error;
      }
      toast.success("Payment details updated!");

      // Refresh
      const { data: refreshed } = await (supabase as any)
        .from('bank_accounts')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_primary', true)
        .maybeSingle();
      if (refreshed) setBankAccount(refreshed);

    } catch (err: any) {
      toast.error("Failed to save payment details: " + err.message);
    } finally {
      setIsBankSaving(false);
    }
  };

  const handleVerifyPayment = async (ticketId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('tickets')
        .update({ payment_status: 'paid' })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success("Payment verified! Ticket is now valid.");
      // List will update via realtime subscription
    } catch (err: any) {
      toast.error("Failed to verify: " + err.message);
    }
  };

  const pendingTickets = tickets.filter(t => t.payment_status === 'pending');

  if (!event) return null;

  const validatedCount = tickets.filter(t => t.is_validated).length;
  const pendingCount = tickets.length - validatedCount;
  const uniqueAttendees = Array.from(new Set(tickets.map(t => t.attendee_email))).length;

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ModeToggle />
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gradient-cyber mb-2">
              {event.title}
            </h1>
            <p className="text-muted-foreground flex items-center gap-4">
              Event Management Dashboard
              <span className="text-sm">•</span>
              <span className="text-primary font-semibold">{tickets.length} Tickets Created</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => navigate(`/scanner/${eventId}`)}
            >
              <ScanLine className="w-5 h-5 mr-2" />
              Launch Scanner
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="cyber" size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Generate Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="border-2 border-primary/30 max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-gradient-cyber">
                    {newlyGeneratedTicket ? 'Ticket Generated!' : 'Generate New Ticket'}
                  </DialogTitle>
                </DialogHeader>

                {!newlyGeneratedTicket ? (
                  <form onSubmit={handleGenerateTicket} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Attendee Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Attendee Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Attendee Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+919876543210"
                        required
                      />
                    </div>

                    {/* Ticket Tier Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="tier">Ticket Tier</Label>
                      <Select
                        value={formData.tierId}
                        onValueChange={(value) => setFormData({ ...formData, tierId: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a ticket tier" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiers.map((tier) => (
                            <SelectItem key={tier.id} value={tier.id}>
                              {tier.name} - ₹{tier.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the ticket category (VIP, General, etc.)
                      </p>
                    </div>

                    {/* Security PIN Field */}
                    <div className="space-y-2">
                      <Label htmlFor="security-pin" className="text-primary font-semibold">
                        🔒 Security PIN (4-6 digits) *
                      </Label>
                      <Input
                        id="security-pin"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 4-6 digit PIN"
                        value={formData.securityPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Only digits
                          setFormData({ ...formData, securityPin: value });
                        }}
                        className="text-center text-2xl tracking-widest font-bold"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        ⚠️ <strong>Important:</strong> Customer needs this PIN + email + phone to retrieve tickets later
                      </p>
                    </div>
                    {/* Payment Reference Field */}
                    <div className="space-y-2">
                      <Label htmlFor="payment-ref" className="text-sm font-semibold">
                        Payment Reference (Optional)
                      </Label>
                      <Input
                        id="payment-ref"
                        type="text"
                        placeholder="UPI Ref, Cash, Comp, etc."
                        value={formData.paymentRef}
                        onChange={(e) => setFormData({ ...formData, paymentRef: e.target.value })}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Enter UPI transaction ID, "CASH", "COMP", or leave blank for auto-generated ref
                      </p>
                    </div>
                    <Button
                      type="submit"
                      variant="cyber"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Generating...' : 'Generate Ticket'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                    <div id="new-ticket-card" className="transform scale-90 sm:scale-100 origin-center">
                      <TicketCard ticket={newlyGeneratedTicket} />
                    </div>

                    {/* Security PIN Display - Prominent */}
                    <div className="p-4 border-2 border-primary/30 bg-primary/10 rounded-lg space-y-2">
                      <p className="font-bold text-lg text-foreground flex items-center gap-2">
                        <span className="text-2xl">🔒</span>
                        Your Security PIN: <span className="text-3xl tracking-widest font-mono text-primary">{newlyGeneratedTicket.security_pin || formData.securityPin}</span>
                      </p>
                      <div className="text-sm text-foreground/90 space-y-1 ml-9">
                        <p>✓ <strong>You chose this PIN!</strong> Save it to retrieve tickets later</p>
                        <p>✓ Customer needs: <strong>Email + Phone + This PIN</strong> to access tickets</p>
                        <p>✓ Also sent via email for safekeeping</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-9"
                        onClick={() => {
                          navigator.clipboard.writeText(newlyGeneratedTicket.security_pin || formData.securityPin);
                          toast.success('PIN copied to clipboard!');
                        }}
                      >
                        📋 Copy PIN
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Button variant="outline" onClick={printTicket} className="flex flex-col h-auto py-3 gap-2">
                        <Printer className="w-5 h-5" />
                        <span className="text-xs">Print</span>
                      </Button>
                      <Button variant="outline" onClick={downloadTicketImage} className="flex flex-col h-auto py-3 gap-2">
                        <Download className="w-5 h-5" />
                        <span className="text-xs">Download</span>
                      </Button>
                      <Button variant="outline" onClick={shareTicket} className="flex flex-col h-auto py-3 gap-2">
                        <Share2 className="w-5 h-5" />
                        <span className="text-xs">Share</span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setNewlyGeneratedTicket(null);
                        setFormData({ name: '', email: '', phone: '', securityPin: '', paymentRef: '' });
                        setIsDialogOpen(false);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {tickets.length === 0 ? (
          <Card className="border-2 border-primary/20 p-12 text-center">
            <TicketIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate your first ticket to get started
            </p>
            <Button variant="cyber" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Ticket
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            <EventStats
              totalTickets={tickets.length}
              validatedTickets={validatedCount}
              pendingTickets={pendingCount}
              attendees={tickets}
              tiers={tiers}
            />

            <Tabs defaultValue="tickets" className="space-y-6">
              <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-7 h-auto">
                <TabsTrigger value="tickets">
                  <TicketIcon className="w-4 h-4 mr-2" />
                  Tickets
                </TabsTrigger>
                <TabsTrigger value="attendees">
                  <Users className="w-4 h-4 mr-2" />
                  Attendees
                </TabsTrigger>
                <TabsTrigger value="waitlist">
                  <Clock className="w-4 h-4 mr-2" />
                  Waitlist
                </TabsTrigger>
                <TabsTrigger value="door-staff">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Door Staff
                </TabsTrigger>
                <TabsTrigger value="bulk-actions">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Archive
                </TabsTrigger>
                <TabsTrigger value="customize">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </TabsTrigger>
                <TabsTrigger value="payment">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tickets">
                {pendingTickets.length > 0 && (
                  <div className="mb-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-amber-500 mb-4">
                      <AlertCircle className="w-6 h-6" />
                      Pending Payment Verifications ({pendingTickets.length})
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {pendingTickets.map(ticket => (
                        <div key={ticket.id} className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                          <div>
                            <p className="font-semibold">{ticket.attendee_name}</p>
                            <p className="text-sm text-muted-foreground">{ticket.ticket_code}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {ticket.payment_ref_id || 'Manual'}
                            </Badge>
                          </div>
                          <Button size="sm" onClick={() => handleVerifyPayment(ticket.id)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Verify
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {tickets.length > 0 && (
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedTickets.length === tickets.length) {
                            setSelectedTickets([]);
                          } else {
                            setSelectedTickets(tickets.map(t => t.id));
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTickets.length === tickets.length && tickets.length > 0}
                          onChange={() => { }}
                          className="mr-2 cursor-pointer"
                        />
                        Select All ({tickets.length})
                      </Button>

                      {selectedTickets.length > 0 && (
                        <Badge variant="secondary" className="text-sm">
                          {selectedTickets.length} selected
                        </Badge>
                      )}
                    </div>

                    {selectedTickets.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={() => setBulkDeleteOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected ({selectedTickets.length})
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {tickets.map((ticket) => {
                    const isSelected = selectedTickets.includes(ticket.id);

                    return (
                      <div
                        key={ticket.id}
                        className={`relative border-2 rounded-lg transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent'
                          }`}
                      >
                        {/* Selection Checkbox */}
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (isSelected) {
                                setSelectedTickets(prev => prev.filter(id => id !== ticket.id));
                              } else {
                                setSelectedTickets(prev => [...prev, ticket.id]);
                              }
                            }}
                            className="w-5 h-5 cursor-pointer accent-primary"
                          />
                        </div>

                        {/* Ticket Card */}
                        <Link to={`/ticket/${ticket.id}`}>
                          <div className="transition-transform hover:scale-105 pl-8">
                            <TicketCard ticket={ticket} compact />
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Bulk Delete Dialog */}
                <BulkDeleteDialog
                  open={bulkDeleteOpen}
                  onOpenChange={setBulkDeleteOpen}
                  selectedTickets={tickets.filter(t => selectedTickets.includes(t.id))}
                  eventId={eventId!}
                  onSuccess={() => {
                    setSelectedTickets([]);
                    // Refresh tickets
                    window.location.reload();
                  }}
                />
              </TabsContent>

              <TabsContent value="attendees">
                <AttendeeList tickets={tickets} eventTitle={event.title} eventId={eventId!} />
              </TabsContent>

              <TabsContent value="customize">
                <EventCustomization
                  eventId={eventId!}
                  userId={user!.id}
                  initialData={{
                    galleryImages: event.gallery_images,
                    videos: event.videos,
                    faq: event.faq,
                    schedule: event.schedule,
                    additionalInfo: event.additional_info,
                    socialLinks: event.social_links,
                    sponsors: event.sponsors,
                    upiId: event.upi_id || '',
                    paymentQrImageUrl: event.qr_code_url || ''
                  }}
                />
              </TabsContent>

              <TabsContent value="payment">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Payment Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBankSave} className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input
                          value={bankForm.account_holder_name}
                          onChange={e => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                          placeholder="Enter your name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UPI ID</Label>
                        <Input
                          value={bankForm.upi_id}
                          onChange={e => setBankForm({ ...bankForm, upi_id: e.target.value })}
                          placeholder="yourname@upi"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>QR Code URL (Image Link)</Label>
                        <Input
                          value={bankForm.qr_code_url}
                          onChange={e => setBankForm({ ...bankForm, qr_code_url: e.target.value })}
                          placeholder="https://example.com/qr.png"
                        />
                        <p className="text-xs text-muted-foreground">Upload your QR code to a public URL and paste it here.</p>
                      </div>
                      <Button type="submit" disabled={isBankSaving} className="w-full">
                        {isBankSaving ? "Saving..." : "Save Payment Details"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="waitlist">
                <WaitlistManager eventId={eventId!} />
              </TabsContent>

              <TabsContent value="door-staff">
                <DoorStaffManager eventId={eventId!} />
              </TabsContent>

              <TabsContent value="bulk-actions">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Archive className="w-5 h-5 text-primary" />
                          Archive & Bulk Actions
                        </CardTitle>
                        <CardDescription className="mt-1">
                          View archived tickets and manage bulk operations
                        </CardDescription>
                      </div>
                      <Button onClick={() => navigate('/admin/archive')}>
                        <Archive className="w-4 h-4 mr-2" />
                        Open Archive
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                          ✅ Bulk Delete - Now Live!
                        </h3>
                        <p className="text-sm text-green-800 mb-4">
                          You can now select multiple tickets from the Tickets tab and archive them safely.
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-muted-foreground mb-1">How to use:</p>
                            <ul className="text-xs space-y-1">
                              <li>1. Go to "Tickets" tab</li>
                              <li>2. Check tickets to select</li>
                              <li>3. Click "Delete Selected"</li>
                              <li>4. Confirm deletion</li>
                            </ul>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-muted-foreground mb-1">Features:</p>
                            <ul className="text-xs space-y-1">
                              <li>✓ Select individual tickets</li>
                              <li>✓ Select all at once</li>
                              <li>✓ 2-step confirmation</li>
                              <li>✓ 14-day archive</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="font-semibold text-blue-900 mb-2">📦 Ticket Archive</h3>
                        <p className="text-sm text-blue-800 mb-4">
                          Deleted tickets are safely stored for 14 days before permanent deletion.
                          Visit the Archive page to view and restore tickets.
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-muted-foreground mb-1">Features:</p>
                            <ul className="text-xs space-y-1">
                              <li>✓ 14-day retention</li>
                              <li>✓ One-click restore</li>
                              <li>✓ Audit trail</li>
                            </ul>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-muted-foreground mb-1">Operations:</p>
                            <ul className="text-xs space-y-1">
                              <li>• View all archived</li>
                              <li>• Restore tickets</li>
                              <li>• Permanent delete</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketManagement;