import { useState } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Mail, 
  Share2, 
  ExternalLink, 
  Copy, 
  Check,
  Calendar,
  MapPin,
  User,
  Phone,
  Ticket
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TicketDetailDrawerProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TicketDetailDrawer = ({ ticket, open, onOpenChange }: TicketDetailDrawerProps) => {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!ticket) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pay_at_venue': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleViewTicket = () => {
    window.open(`/ticket/${ticket.id}`, '_blank');
  };

  const handleDownload = () => {
    window.open(`/ticket/${ticket.id}?download=true`, '_blank');
    toast.success('Opening ticket for download');
  };

  const handleResendEmail = async () => {
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-ticket-email', {
        body: {
          ticketId: ticket.id,
          attendeeEmail: ticket.attendee_email,
          attendeeName: ticket.attendee_name,
          eventTitle: ticket.events?.title,
          eventDate: ticket.events?.event_date,
          ticketCode: ticket.ticket_code,
        },
      });

      if (error) throw error;
      toast.success(`Ticket sent to ${ticket.attendee_email}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send ticket email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShare = async () => {
    const ticketUrl = `${window.location.origin}/ticket/${ticket.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket for ${ticket.events?.title}`,
          text: `${ticket.attendee_name}'s ticket for ${ticket.events?.title}`,
          url: ticketUrl,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(ticketUrl);
      toast.success('Ticket link copied!');
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(ticket.ticket_code);
    setCopied(true);
    toast.success('Ticket code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-auto pb-8">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle className="text-xl">{ticket.events?.title}</DrawerTitle>
            <DrawerDescription>
              <Badge variant="outline" className={cn("mt-2", getStatusColor(ticket.payment_status || 'pending'))}>
                {(ticket.payment_status || 'pending').replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-background p-4 rounded-2xl border border-border shadow-lg">
                <QRCodeSVG
                  value={ticket.ticket_code}
                  size={180}
                  level="H"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="hsl(180 100% 95%)"
                />
              </div>
            </div>

            {/* Ticket Code */}
            <button 
              onClick={handleCopyCode}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-muted/50 rounded-xl active:scale-[0.98] transition-transform"
            >
              <span className="font-mono text-lg font-bold text-primary tracking-wider">
                {ticket.ticket_code}
              </span>
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Ticket Details */}
            <div className="space-y-3 bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Attendee</p>
                  <p className="font-medium">{ticket.attendee_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{ticket.attendee_email}</p>
                </div>
              </div>

              {ticket.attendee_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{ticket.attendee_phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Event Date</p>
                  <p className="font-medium">
                    {format(new Date(ticket.events?.event_date), 'EEEE, MMMM d, yyyy • h:mm a')}
                  </p>
                </div>
              </div>

              {ticket.ticket_tiers && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket Tier</p>
                    <p className="font-medium">
                      {ticket.ticket_tiers.name} • ₹{ticket.ticket_tiers.price}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-14 flex-col gap-1"
                onClick={handleViewTicket}
              >
                <ExternalLink className="w-5 h-5" />
                <span className="text-xs">View</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 flex-col gap-1"
                onClick={handleDownload}
              >
                <Download className="w-5 h-5" />
                <span className="text-xs">Download</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 flex-col gap-1"
                onClick={handleResendEmail}
                disabled={sendingEmail}
              >
                <Mail className="w-5 h-5" />
                <span className="text-xs">{sendingEmail ? 'Sending...' : 'Email'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 flex-col gap-1"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5" />
                <span className="text-xs">Share</span>
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default TicketDetailDrawer;
