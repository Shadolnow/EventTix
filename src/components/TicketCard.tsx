import { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Calendar, MapPin, User, Ticket as TicketIcon } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface TicketCardProps {
  ticket: any;
  compact?: boolean;
  showActions?: boolean;
}

export const TicketCard = ({ ticket, compact = false, showActions = true }: TicketCardProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!ticketRef.current) return;

    try {
      // Add a solid background color to the element before capturing
      const originalBg = ticketRef.current.style.background;
      ticketRef.current.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#667eea',
      });

      // Restore original background
      ticketRef.current.style.background = originalBg;

      const link = document.createElement("a");
      link.download = `Ticket-${ticket.ticket_code}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast.success("Ticket downloaded!");
    } catch (error) {
      toast.error("Failed to download ticket");
      console.error(error);
    }
  };

  const handleShare = async () => {
    if (!ticketRef.current) return;

    try {
      const originalBg = ticketRef.current.style.background;
      ticketRef.current.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#667eea',
      });

      ticketRef.current.style.background = originalBg;

      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          const file = new File([blob], `Ticket-${ticket.ticket_code}.png`, { type: "image/png" });
          await navigator.share({
            title: `${ticket.events.title} Ticket`,
            text: `Ticket Code: ${ticket.ticket_code}`,
            files: [file],
          });
        } else {
          await navigator.clipboard.writeText(`Ticket for ${ticket.events.title}\nCode: ${ticket.ticket_code}`);
          toast.info("Ticket info copied to clipboard!");
        }
      }, "image/png", 1.0);
    } catch (error) {
      toast.error("Failed to share ticket");
      console.error(error);
    }
  };

  const tierName = ticket.tier_name || ticket.ticket_tiers?.name || 'GENERAL ADMISSION';

  return (
    <div className="space-y-4">
      {/* Premium Ticket Design */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)',
        }}
      >
        {/* Decorative Pattern Overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, white 2px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative p-8 text-white">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <TicketIcon className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-widest uppercase opacity-90">
                Live Event Ticket
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-1 leading-tight">
              {ticket.events.title}
            </h1>
            <p className="text-sm opacity-90 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {format(new Date(ticket.events.event_date), 'PPP • p')}
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/20 my-6" />

          {/* Ticket Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs opacity-70 mb-1">Attendee</p>
              <p className="font-semibold flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {ticket.attendee_name}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70 mb-1">Venue</p>
              <p className="font-semibold flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {ticket.events.venue}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70 mb-1">Ticket Type</p>
              <p className="font-semibold text-sm">{tierName}</p>
            </div>
            <div>
              <p className="text-xs opacity-70 mb-1">Status</p>
              <Badge
                variant={ticket.is_validated ? "default" : "secondary"}
                className={ticket.is_validated ? "bg-green-500" : "bg-yellow-500"}
              >
                {ticket.is_validated ? "✓ Validated" : "Active"}
              </Badge>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex items-center justify-between gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex-1">
              <p className="text-xs opacity-70 mb-1">Ticket Code</p>
              <p className="font-mono font-bold text-lg tracking-wider">
                {ticket.ticket_code}
              </p>
              {ticket.batch_id && ticket.quantity_in_batch > 1 && (
                <Badge variant="outline" className="mt-2 border-white/30 text-white">
                  {ticket.ticket_number_in_batch} of {ticket.quantity_in_batch}
                </Badge>
              )}
            </div>
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG
                value={`https://eventtix-psi.vercel.app/validate/${ticket.ticket_code}`}
                size={80}
                level="H"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-xs opacity-70 text-center">
              Scan QR code at venue entrance • Keep this ticket safe
            </p>
          </div>
        </div>

        {/* Decorative Corner Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-2 justify-center">
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleShare} variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      )}
    </div>
  );
};