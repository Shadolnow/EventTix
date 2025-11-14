import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialShare } from '@/components/SocialShare';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, MapPin, Download, ArrowLeft, DollarSign, Ticket, Clock, HelpCircle, Image as ImageIcon, CalendarPlus, Users, AlertCircle, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { TicketCard } from '@/components/TicketCard';
import { downloadICS } from '@/utils/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import html2canvas from 'html2canvas';

const claimSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(10, "Valid phone number required").max(20)
});

const PublicEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [claimedTicket, setClaimedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
      
      // Check capacity
      if (event.capacity) {
        const { data: availabilityData } = await supabase
          .rpc('check_ticket_availability', { event_id_input: eventId });
        
        if (!availabilityData) {
          toast.error('Sorry, this event is sold out!');
          return;
        }
      }
      
      setLoading(true);
      // Call secure Edge Function that enforces rate limiting
      const { data, error } = await (supabase as any).functions.invoke('public-claim-ticket', {
        body: {
          eventId,
          name: validated.name,
          phone: validated.phone,
        },
      });

      if (error) {
        throw error;
      }

      if (!data || !data.ticket) {
        throw new Error('Failed to issue ticket');
      }

      const ticket = data.ticket;
      setClaimedTicket({ ...ticket, events: event });
      toast.success('Ticket claimed successfully!');
      
      // Open WhatsApp - provide alternative if blocked
      const ticketUrl = `${window.location.origin}/ticket/${ticket.id}`;
      const message = `🎫 Your ticket for ${event.title}\n\nEvent: ${event.title}\nDate: ${format(new Date(event.event_date), 'PPP')}\nVenue: ${event.venue}\nTicket Code: ${ticket.ticket_code}\n\nView your ticket: ${ticketUrl}`;
      
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
        console.error('Ticket claim failed:', error);
        // Friendly, non-leaky messages
        const message = typeof error?.message === 'string' ? error.message : 'Failed to claim ticket';
        // Map known edge function responses to friendly messages if available
        if (message.includes('rate_limited')) {
          toast.error('Too many requests. Please wait a few seconds and try again.');
        } else if (message.includes('duplicate_email')) {
          toast.error('A ticket has already been issued for this email for this event.');
        } else if (message.toLowerCase().includes('sold out')) {
          toast.error('Sorry, this event is sold out!');
        } else {
          toast.error('Unable to issue ticket at the moment. Please try again later.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'png' | 'jpg' | 'pdf' = 'png') => {
    const ticketElement = document.getElementById('ticket-card');
    if (!ticketElement) {
      toast.error('Ticket not found');
      return;
    }

    setDownloading(true);
    try {
      toast.info('Generating ticket image...', { duration: 2000 });
      
      // Wait for animations to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(ticketElement, {
        backgroundColor: format === 'jpg' ? '#0a0f1c' : null,
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      if (format === 'pdf') {
        // For PDF, we'll use jsPDF
        const { default: jsPDF } = await import('jspdf');
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`ticket-${claimedTicket.ticket_code}.pdf`);
        toast.success('Ticket downloaded as PDF!');
      } else {
        // Convert to blob for PNG/JPG
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error('Failed to generate image');
          }
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `ticket-${claimedTicket.ticket_code}.${format}`;
          link.href = url;
          link.click();
          
          setTimeout(() => URL.revokeObjectURL(url), 100);
          
          toast.success(`Ticket downloaded as ${format.toUpperCase()}!`);
        }, mimeType, 1.0);
      }
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please take a screenshot instead.', {
        description: 'On mobile: Long press the ticket and select "Save Image"'
      });
    } finally {
      setDownloading(false);
    }
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
            <div className="flex flex-wrap gap-4">
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
              {event.capacity && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  {event.tickets_issued} / {event.capacity} tickets claimed
                </p>
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

            <Button 
              variant="outline" 
              onClick={handleAddToCalendar}
              className="w-full sm:w-auto"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Add to Calendar
            </Button>

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
              {event.capacity && (
                <p className="text-sm text-muted-foreground mb-2">
                  {event.capacity - event.tickets_issued} tickets remaining
                </p>
              )}
              <p className="text-muted-foreground mb-6">
                Online ticket purchase will be available soon
              </p>
              <Button variant="outline" disabled>
                <Ticket className="w-4 h-4 mr-2" />
                Purchase Ticket (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        ) : event.capacity && event.tickets_issued >= event.capacity ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-lg">
              This event is sold out. All tickets have been claimed.
            </AlertDescription>
          </Alert>
        ) : !claimedTicket ? (
          <Card>
            <CardHeader>
              <CardTitle>Claim Your Free Ticket</CardTitle>
              <CardDescription>
                Enter your details to receive your ticket
                {event.capacity && (
                  <span className="block mt-2 text-primary">
                    {event.capacity - event.tickets_issued} tickets remaining
                  </span>
                )}
              </CardDescription>
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
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                    required
                    minLength={10}
                    maxLength={20}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Claiming...' : 'Get Free Ticket'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Ticket</CardTitle>
                <CardDescription>
                  Download your ticket or share it on social media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div id="ticket-card">
                  <TicketCard ticket={claimedTicket} />
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-3">Download Ticket</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownload('png')}
                      disabled={downloading}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PNG
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownload('jpg')}
                      disabled={downloading}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      JPG
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownload('pdf')}
                      disabled={downloading}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  {downloading && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Generating your ticket...
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Share Ticket</h3>
                  <Button 
                    size="lg"
                    className="w-full mb-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    onClick={async () => {
                      const ticketUrl = `${window.location.origin}/ticket/${claimedTicket.id}`;
                      const text = `🎫 My ticket for ${event.title}`;
                      
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: `Ticket: ${event.title}`,
                            text,
                            url: ticketUrl
                          });
                        } catch (error: any) {
                          if (error.name !== 'AbortError') {
                            await navigator.clipboard.writeText(ticketUrl);
                            toast.success('Link copied to clipboard!');
                          }
                        }
                      } else {
                        await navigator.clipboard.writeText(ticketUrl);
                        toast.success('Link copied to clipboard!');
                      }
                    }}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share Ticket
                  </Button>
                  
                  <div className="relative mb-3">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or share via</span>
                    </div>
                  </div>
                  
                  <SocialShare 
                    url={`${window.location.origin}/ticket/${claimedTicket.id}`}
                    title={`My ticket for ${event.title}`}
                    description={`I'm attending ${event.title} on ${format(new Date(event.event_date), 'PPP')}. Check out my ticket!`}
                  />
                </div>
                
                <Alert>
                  <Ticket className="h-4 w-4" />
                  <AlertDescription>
                    Please present this ticket at the event entrance for validation.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicEvent;