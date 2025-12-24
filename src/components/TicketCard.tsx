import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Ticket, Download, Share2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { LocationQR } from './LocationQR';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface TicketCardProps {
  ticket: {
    id: string;
    ticket_code: string;
    attendee_name: string;
    attendee_email: string;
    attendee_phone?: string;
    created_at?: string; // Added creation date
    is_validated: boolean;
    tier_id?: string;
    tier_name?: string;
    batch_id?: string; // Batch tracking
    quantity_in_batch?: number;
    ticket_number_in_batch?: number;
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
  showActions?: boolean;
}

export const TicketCard = ({ ticket, compact = false, showActions = true }: TicketCardProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null, // Transparent background for the PNG
        scale: 3,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `Ticket-LIVE-${ticket.ticket_code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Ticket downloaded!");
    } catch (error) {
      toast.error("Failed to download ticket");
      console.error(error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null,
        scale: 3,
      });
      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          const file = new File([blob], `Ticket-${ticket.ticket_code}.png`, { type: "image/png" });
          await navigator.share({
            title: `${ticket.events.title} Ticket`,
            text: `LIVE: ${ticket.events.title} Ticket Code: ${ticket.ticket_code}`,
            files: [file],
          });
        } else {
          await navigator.clipboard.writeText(`Ticket for ${ticket.events.title}\nCode: ${ticket.ticket_code}`);
          toast.info("Ticket info copied to clipboard!");
        }
      });
    } catch (error) {
      toast.error("Failed to share ticket");
      console.error(error);
    }
  };

  const tierName = ticket.tier_name || ticket.ticket_tiers?.name || 'GENERAL ADMISSION';

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      {/* THE TICKET */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-[380px] mx-auto overflow-hidden rounded-[2rem] font-sans text-white shadow-2xl transition-transform hover:scale-[1.01]"
        style={{
          background: '#050505', // Deep dark background
          boxShadow: '0 0 40px rgba(139, 92, 246, 0.15), 0 0 20px rgba(0, 229, 255, 0.1)'
        }}
      >
        {/* === Background Effects === */}
        {/* Cyan Glow - Top Left */}
        <div className="absolute top-[-20%] left-[-30%] w-[80%] h-[50%] bg-[#00E5FF] rounded-full blur-[120px] opacity-20" />
        {/* Purple/Pink Glow - Bottom Right */}
        <div className="absolute bottom-[-20%] right-[-30%] w-[80%] h-[50%] bg-[#d946ef] rounded-full blur-[120px] opacity-20" />

        {/* Tech Lines / Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }}
        />

        {/* Subtle Noise */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />

        {/* === Main Content Section === */}
        <div className="relative p-8 pb-10 z-10">

          {/* Top Date & Status */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-[#00E5FF]" />
              <span className="text-[10px] font-bold tracking-widest text-[#00E5FF] uppercase">
                {format(new Date(ticket.events.event_date), 'MMM dd • h:mm a')}
              </span>
            </div>
            {/* Status Indicator */}
            <div className={`w-2 h-2 rounded-full shadow-[0_0_10px] ${ticket.is_validated ? 'bg-green-500 shadow-green-500' : 'bg-[#00E5FF] shadow-[#00E5FF] animate-pulse'}`} />
          </div>

          {/* Centered Beautiful Header */}
          <div className="text-center mb-8 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#00E5FF] blur-[80px] opacity-10 pointer-events-none" />

            <div className="flex gap-2 justify-center mb-3">
              <Badge variant="outline" className="border-[#00E5FF]/30 text-[#00E5FF] bg-[#00E5FF]/5 tracking-[0.2em] text-[10px] py-0.5 px-3 uppercase">
                {tierName}
              </Badge>
              {/* Batch Information Badge */}
              {ticket.batch_id && ticket.quantity_in_batch && ticket.quantity_in_batch > 1 && (
                <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/5 tracking-[0.2em] text-[10px] py-0.5 px-3 uppercase">
                  {ticket.ticket_number_in_batch} of {ticket.quantity_in_batch}
                </Badge>
              )}
            </div>

            <h2 className="relative text-4xl font-black italic uppercase tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70 drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">
              {ticket.events.title}
            </h2>

            {/* Ticket Creation Time */}
            <p className="text-[9px] text-slate-400 mt-3 font-medium tracking-wider uppercase">
              Issued: {ticket.created_at ? format(new Date(ticket.created_at), 'MMM dd, h:mm a') : format(new Date(), 'MMM dd, h:mm a')}
            </p>
          </div>

          {/* Info Grid with Small Venue QR */}
          <div className="space-y-4">

            {/* Venue Card with Mini QR */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-3 transition-all hover:border-[#d946ef]/40">
              <div className="flex items-start gap-3">
                <div className="bg-white p-1 rounded-sm shrink-0">
                  <QRCodeSVG value={ticket.events.venue} size={36} level="L" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-[#d946ef]" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium">Venue</p>
                  </div>
                  <p className="font-bold text-sm leading-tight text-slate-200 line-clamp-2">{ticket.events.venue}</p>
                </div>
              </div>
            </div>

            {/* Attendee Strip */}
            {ticket.attendee_name && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-1">Attendee</p>
                  <p className="text-lg font-mono text-[#00E5FF] tracking-widest uppercase truncate max-w-[200px]">{ticket.attendee_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === The Tear Line with Notches === */}
        <div className="relative h-px bg-transparent">
          {/* The visually dashed line */}
          <div className="absolute top-0 left-6 right-6 border-b-2 border-dashed border-[#ffffff]/20" />

          {/* Left Notch */}
          <div className="absolute top-1/2 left-[-12px] -translate-y-1/2 w-6 h-6 rounded-full bg-background shadow-inner border-r border-white/5" />

          {/* Right Notch */}
          <div className="absolute top-1/2 right-[-12px] -translate-y-1/2 w-6 h-6 rounded-full bg-background shadow-inner border-l border-white/5" />
        </div>

        {/* === Stub Section (QR) === */}
        <div className="relative p-8 pt-10 z-10 flex flex-col items-center">
          <div className="relative group cursor-pointer">
            {/* Glowing Border for QR */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-[#00E5FF] via-[#8A2BE2] to-[#FF00FF] rounded-2xl opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-3 bg-white rounded-xl overflow-hidden">
              <QRCodeSVG value={ticket.ticket_code} size={compact ? 130 : 160} level="Q" />
            </div>
          </div>

          <div className="text-center mt-6 space-y-1">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em]">Code</p>
            <p className="font-mono text-2xl font-black text-white tracking-[0.2em]">{ticket.ticket_code}</p>
          </div>

          {/* Bottom Decoration */}
          <div className="mt-8 flex items-center gap-2 opacity-30 w-full justify-center">
            {[...Array(12)].map((_, i) => (
              <div key={i} className={`h-1 rounded-full bg-white ${i % 2 === 0 ? 'w-1' : 'w-4'}`} />
            ))}
          </div>
        </div>

        {/* Neon Footer Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00E5FF] via-[#8A2BE2] to-[#FF00FF]" />
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3 max-w-[380px] mx-auto no-print">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1 bg-black/20 border-white/10 text-slate-300 hover:bg-[#00E5FF]/10 hover:text-[#00E5FF] hover:border-[#00E5FF]/30 transition-all"
          >
            <Download className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 bg-black/20 border-white/10 text-slate-300 hover:bg-[#d946ef]/10 hover:text-[#d946ef] hover:border-[#d946ef]/30 transition-all"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      )}
    </div>
  );
};