import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TicketCard } from '@/components/TicketCard';
import { AttendeeList } from '@/components/AttendeeList';
import { EventStats } from '@/components/EventStats';
import { EventCustomization } from '@/components/EventCustomization';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { ArrowLeft, Plus, Ticket as TicketIcon, Users, Settings } from 'lucide-react';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const attendeeSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  email: z.string().trim().email({ message: 'Invalid email address' }).max(255),
  phone: z.string().trim().min(10, { message: 'Phone number must be at least 10 digits' }).max(15)
});

const TicketManagement = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (!user || !eventId) return;

    const fetchEventAndTickets = async () => {
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

      // Fetch tickets
      const { data: ticketsData } = await (supabase as any)
        .from('tickets')
        .select('*, events(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (ticketsData) setTickets(ticketsData);
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
          filter: `event_id=eq.${eventId}`
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

  const generateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = attendeeSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      // Generate cryptographically secure ticket code
      const ticketCode = `${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

      const { data: ticketData, error } = await (supabase as any).from('tickets').insert({
        event_id: eventId,
        ticket_code: ticketCode,
        attendee_name: formData.name,
        attendee_email: formData.email,
        attendee_phone: formData.phone
      }).select().single();

      if (error) throw error;

      // Copy ticket link to clipboard - user can share manually
      const ticketUrl = `${window.location.origin}/ticket/${ticketData.id}`;
      const message = 
        `🎟️ Your ticket for ${event.title}\n\n` +
        `📅 ${new Date(event.event_date).toLocaleString()}\n` +
        `📍 ${event.venue}\n\n` +
        `View your ticket: ${ticketUrl}`;
      
      await navigator.clipboard.writeText(message);
      toast.success('Ticket generated! Link copied to clipboard - share it with the attendee.', {
        duration: 5000
      });
      
      setFormData({ name: '', email: '', phone: '' });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Generate ticket error:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!event) return null;

  const validatedCount = tickets.filter(t => t.is_validated).length;
  const pendingCount = tickets.length - validatedCount;
  const uniqueAttendees = Array.from(new Set(tickets.map(t => t.attendee_email))).length;

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => navigate('/events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

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

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="cyber" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Generate Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-primary/30">
              <DialogHeader>
                <DialogTitle className="text-2xl text-gradient-cyber">
                  Generate New Ticket
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={generateTicket} className="space-y-4">
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
                  <p className="text-xs text-muted-foreground">
                    Ticket link will be copied to clipboard for you to share
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
            </DialogContent>
          </Dialog>
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
            />

            <Tabs defaultValue="tickets" className="space-y-6">
              <TabsList className="grid w-full md:w-auto grid-cols-3">
                <TabsTrigger value="tickets">
                  <TicketIcon className="w-4 h-4 mr-2" />
                  Tickets
                </TabsTrigger>
                <TabsTrigger value="attendees">
                  <Users className="w-4 h-4 mr-2" />
                  Attendees
                </TabsTrigger>
                <TabsTrigger value="customize">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </TabsTrigger>
              </TabsList>

            <TabsContent value="tickets">
              <div className="grid md:grid-cols-2 gap-6">
                {tickets.map((ticket) => (
                  <Link key={ticket.id} to={`/ticket/${ticket.id}`}>
                    <div className="transition-transform hover:scale-105">
                      <TicketCard ticket={ticket} compact />
                    </div>
                  </Link>
                ))}
              </div>
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
                    faq: event.faq,
                    schedule: event.schedule,
                    additionalInfo: event.additional_info
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketManagement;