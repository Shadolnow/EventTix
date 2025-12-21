import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Sparkles, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { LocationQR } from './LocationQR';

interface TicketCardProps {
  ticket: {
    id: string;
    ticket_code: string;
    attendee_name: string;
    attendee_email: string;
    attendee_phone?: string;
    is_validated: boolean;
    tier_id?: string;
    tier_name?: string;
    ticket_tiers?: {
      name: string;
      price: number;
    };
    events: {
      title: string;
      venue: string;
      event_date: string;
      promotion_text?: string;
    };
  };
  compact?: boolean;
}

export const TicketCard = ({ ticket, compact = false }: TicketCardProps) => {
  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-card via-card to-card/80">
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Circuit pattern overlay */}
      <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 200 200">
          <path
            d="M 20 20 L 80 20 L 80 60 M 120 20 L 180 20 L 180 80 M 20 100 L 60 100 L 60 160 M 140 100 L 180 100"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-primary"
          />
          <circle cx="80" cy="60" r="4" fill="currentColor" className="text-primary" />
          <circle cx="180" cy="80" r="4" fill="currentColor" className="text-accent" />
          <circle cx="60" cy="160" r="4" fill="currentColor" className="text-secondary" />
        </svg>
      </div>

      <div className="relative p-6 space-y-6">
        {/* Header with validation status */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-gradient-cyber mb-1">
              {ticket.events.title}
            </h3>
            <p className="text-sm text-muted-foreground">{ticket.attendee_name}</p>
            {ticket.attendee_phone && (
              <p className="text-xs text-muted-foreground mt-1">📱 {ticket.attendee_phone}</p>
            )}
            {/* Tier badge */}
            {(ticket.tier_name || ticket.ticket_tiers?.name) && (
              <Badge variant="secondary" className="mt-2">
                <Ticket className="w-3 h-3 mr-1" />
                {ticket.tier_name || ticket.ticket_tiers?.name}
              </Badge>
            )}
          </div>
          {ticket.is_validated && (
            <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/50 text-primary text-xs font-bold shadow-neon-cyan">
              VALIDATED
            </div>
          )}
        </div>

        {/* Event details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(new Date(ticket.events.event_date), 'PPP p')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-accent" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.events.venue)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-primary hover:underline"
            >
              {ticket.events.venue}
            </a>
          </div>
        </div>

        {/* Promotion banner */}
        {ticket.events.promotion_text && (
          <div className="relative overflow-hidden rounded-lg border border-secondary/30 bg-secondary/10 p-3">
            <div className="absolute inset-0 animate-shimmer" />
            <div className="relative flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-semibold text-secondary">
                {ticket.events.promotion_text}
              </span>
            </div>
          </div>
        )}

        {/* QR Codes section */}
        <div className="flex flex-col items-center gap-4 pt-4 border-t border-primary/20">
          <div className="flex gap-6 justify-center items-start flex-wrap">
            {/* Ticket QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative p-4 rounded-xl bg-background border-2 border-primary/30 shadow-neon-cyan">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-xl" />
                <QRCodeSVG
                  value={ticket.ticket_code}
                  size={compact ? 100 : 140}
                  level="H"
                  includeMargin={false}
                  className="relative"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground font-mono">TICKET CODE</p>
                <p className="text-xs font-bold tracking-wider text-primary font-mono">
                  {ticket.ticket_code}
                </p>
              </div>
            </div>

            {/* Location QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <LocationQR
                  address={ticket.events.venue}
                  size={compact ? 100 : 140}
                  showLabel={false}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 justify-center">
                  <MapPin className="w-3 h-3" />
                  VENUE LOCATION
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative footer line */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-full" />
      </div>
    </Card>
  );
};