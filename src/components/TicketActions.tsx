import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, Download, Mail, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

interface TicketActionsProps {
  ticket: any;
  onViewDetails: () => void;
}

export const TicketActions = ({ ticket, onViewDetails }: TicketActionsProps) => {
  const [sendingEmail, setSendingEmail] = useState(false);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onViewDetails}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewTicket}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Ticket
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResendEmail} disabled={sendingEmail}>
          <Mail className="mr-2 h-4 w-4" />
          {sendingEmail ? 'Sending...' : 'Resend Email'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TicketActions;
