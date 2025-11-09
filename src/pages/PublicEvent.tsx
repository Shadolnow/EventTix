import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialShare } from '@/components/SocialShare';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, MapPin, Download, ArrowLeft, DollarSign, Ticket, Clock, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { TicketCard } from '@/components/TicketCard';

const claimSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().min(10, "Valid phone number required").max(20)
});

const PublicEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [claimedTicket, setClaimedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);

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
    };
    
    fetchEvent();
  }, [eventId, navigate]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = claimSchema.parse(formData);
      setLoading(true);
      
      // Generate ticket code
      const ticketCode = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          event_id: eventId,
          attendee_name: validated.name,
          attendee_phone: validated.phone,
          attendee_email: validated.email.toLowerCase(),
          ticket_code: ticketCode
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setClaimedTicket({ ...ticket, events: event });
      toast.success('Ticket claimed successfully!');
      
      // Open WhatsApp - provide alternative if blocked
      const ticketUrl = `${window.location.origin}/ticket/${ticket.id}`;
      const message = `🎫 Your ticket for ${event.title}\n\nEvent: ${event.title}\nDate: ${format(new Date(event.event_date), 'PPP')}\nVenue: ${event.venue}\nTicket Code: ${ticketCode}\n\nView your ticket: ${ticketUrl}`;
      
      // Copy to clipboard as fallback
      navigator.clipboard.writeText(`${message}\n\nManually open WhatsApp and send this to ${validated.phone}`);
      
      // Try to open WhatsApp
      const cleanPhone = validated.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      const popup = window.open(whatsappUrl, '_blank');
      if (!popup) {
        toast.info('Ticket link copied to clipboard! Please manually send to WhatsApp', {
          duration: 5000
        });
      }
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to claim ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    toast.info('To save your ticket, take a screenshot or use the share options below');
  };

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading event...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/public-events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        {/* Event Details */}
        <Card className="mb-8">
          {event.image_url && (
            <div className="w-full h-64 md:h-80 overflow-hidden rounded-t-lg">
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-3xl">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              {format(new Date(event.event_date), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {event.venue}
              </a>
            </p>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
            {event.promotion_text && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-primary font-semibold">🎉 {event.promotion_text}</p>
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

        {/* Ticket Claiming or Display */}
        {!event.is_free ? (
          <Card>
            <CardHeader>
              <CardTitle>Paid Event</CardTitle>
              <CardDescription>This is a paid event - ticket purchase coming soon!</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-primary" />
              <p className="text-2xl font-bold mb-2">
                {event.ticket_price} {event.currency}
              </p>
              <p className="text-muted-foreground mb-6">
                Online ticket purchase will be available soon
              </p>
              <Button variant="outline" disabled>
                <Ticket className="w-4 h-4 mr-2" />
                Purchase Ticket (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        ) : !claimedTicket ? (
          <Card>
            <CardHeader>
              <CardTitle>Claim Your Free Ticket</CardTitle>
              <CardDescription>Enter your details to receive your ticket</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClaim} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll send your ticket to this email
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number (with country code) *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                    required
                    maxLength={20}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Claiming...' : 'Claim Free Ticket'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TicketCard ticket={claimedTicket} />
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownload} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                <SocialShare 
                  url={`${window.location.origin}/ticket/${claimedTicket.id}`}
                  title={`Ticket for ${event.title}`}
                  description="Check out my event ticket!"
                  compact
                />
                
                <p className="text-sm text-muted-foreground text-center">
                  Please present this ticket at entry
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicEvent;