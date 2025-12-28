import { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Calendar, MapPin, User, Ticket as TicketIcon } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import '@/styles/premium-animations.css';

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
      {/* Ultra Premium Security Ticket Design */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl group"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #db2777 100%)',
          boxShadow: '0 30px 80px rgba(124, 58, 237, 0.5), 0 0 40px rgba(219, 39, 119, 0.3)',
        }}
      >
        {/* Holographic Animated Background */}
        <div
          className="absolute inset-0 opacity-30 animate-pulse"
          style={{
            background: `
              linear-gradient(45deg, transparent 30%, rgba(0, 229, 255, 0.3) 50%, transparent 70%),
              linear-gradient(-45deg, transparent 30%, rgba(180, 0, 255, 0.3) 50%, transparent 70%)
            `,
            backgroundSize: '200% 200%',
            animation: 'holographic 8s ease-in-out infinite',
          }}
        />

        {/* Guilloche Security Pattern (Anti-Copy) */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 2px, white 2px, white 4px),
              repeating-linear-gradient(-45deg, transparent, transparent 2px, white 2px, white 4px)
            `,
          }}
        />

        {/* Radial Dot Pattern Watermark */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, white 3px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Event Logo Watermark (Repeating) */}
        <div
          className="absolute inset-0 opacity-5 flex items-center justify-center"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ctext x='50' y='50' text-anchor='middle' dominant-baseline='middle' font-size='12' fill='white' opacity='0.3'%3EAUTHENTIC%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '120px 120px',
          }}
        />

        {/* Dynamic Timestamp Security Feature (Updates every second) */}
        <div className="absolute top-2 right-2 text-[8px] font-mono text-white/30">
          {new Date().toLocaleTimeString()}
        </div>

        {/* Security Badge - Top Left */}
        <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-wider">VERIFIED</span>
        </div>

        {/* Animated Security Strip */}
        <div
          className="absolute top-16 left-0 right-0 h-1 opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
            animation: 'securitySweep 4s linear infinite',
          }}
        />

        {/* Floating Particles - Premium Visual Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Layer 1 - Large slow particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`particle-large-${i}`}
              className="absolute rounded-full bg-white/10 backdrop-blur-sm"
              style={{
                width: `${12 + Math.random() * 8}px`,
                height: `${12 + Math.random() * 8}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `floatParticle ${15 + Math.random() * 10}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
              }}
            />
          ))}

          {/* Layer 2 - Medium particles */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`particle-medium-${i}`}
              className="absolute rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20"
              style={{
                width: `${6 + Math.random() * 6}px`,
                height: `${6 + Math.random() * 6}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `floatParticle ${10 + Math.random() * 8}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}

          {/* Layer 3 - Small fast particles (sparkles) */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`particle-small-${i}`}
              className="absolute rounded-full bg-white/30"
              style={{
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `floatParticle ${6 + Math.random() * 6}s ease-in-out infinite, twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Holographic Shimmer Effects - Only Visible on Hover */}
        <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          {/* Layer 1: White Shimmer Streak */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            style={{
              animation: 'holographicShimmer 3s ease-in-out infinite',
              animationDelay: '0s'
            }}
          />

          {/* Layer 2: Rainbow Prismatic Colors */}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(255,0,255,0.3), rgba(0,255,255,0.3), rgba(255,255,0,0.3), rgba(255,0,255,0.3))',
              backgroundSize: '200% 200%',
              animation: 'rainbowPrism 4s ease infinite'
            }}
          />

          {/* Layer 3: Light Streak */}
          <div
            className="absolute top-1/3 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent"
            style={{
              animation: 'lightStreak 2.5s ease-in-out infinite',
              filter: 'blur(2px)'
            }}
          />
        </div>

        <div className="relative p-5 md:p-8 text-white">
          {/* Header Section with Metallic Effect */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <TicketIcon className="w-5 h-5 drop-shadow-lg" />
              <span className="text-xs font-bold tracking-widest uppercase opacity-90 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                Premium Event Ticket
              </span>
            </div>
            <h1 className="text-3xl font-black mb-1 leading-tight drop-shadow-2xl bg-gradient-to-br from-white via-cyan-100 to-white bg-clip-text text-transparent">
              {ticket.events.title}
            </h1>
            <div className="my-3 inline-block">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 rounded-lg border-2 border-white/50 shadow-2xl">
                <p className="text-xs font-bold text-black/70 uppercase tracking-wide">Ticket Type</p>
                <p className="text-xl font-black text-black uppercase tracking-wider">{tierName}</p>
              </div>
            </div>
            <p className="text-sm opacity-90 flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 drop-shadow-md" />
              {format(new Date(ticket.events.event_date), 'PPP • p')}
            </p>
          </div>

          {/* Holographic Divider with Gradient */}
          <div
            className="w-full h-0.5 my-6"
            style={{
              background: 'linear-gradient(90deg, transparent, white, transparent)',
              boxShadow: '0 0 10px rgba(255,255,255,0.5)',
            }}
          />

          {/* Ticket Details Grid with Enhanced Styling */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <p className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wide">Attendee</p>
              <p className="font-bold flex items-center gap-1.5 text-sm">
                <User className="w-4 h-4" />
                {ticket.attendee_name}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <p className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wide">Venue</p>
              {ticket.events.venue?.startsWith('http') ? (
                <a
                  href={ticket.events.venue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold flex items-center gap-1.5 text-cyan-200 hover:text-cyan-100 text-sm"
                >
                  <MapPin className="w-4 h-4" />
                  View Map
                </a>
              ) : (
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <MapPin className="w-4 h-4" />
                  {ticket.events.venue}
                </p>
              )}
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <p className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wide">Ticket Type</p>
              <p className="font-bold text-sm bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">{tierName}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <p className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wide">Status</p>
              <Badge
                variant={ticket.is_validated ? "default" : "secondary"}
                className={`${ticket.is_validated ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-yellow-500 shadow-lg shadow-yellow-500/50"} font-bold border-2 border-white/50`}
              >
                {ticket.is_validated ? "✓ Validated" : "⭐ Active"}
              </Badge>
            </div>
          </div>

          {/* QR Code Section with Premium Border */}
          <div className="flex items-center justify-between gap-4 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-2xl p-5 border-2 border-white/40 shadow-2xl">
            <div className="flex-1">
              <p className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wide">Ticket Code</p>
              <p className="font-mono font-black text-xl tracking-wider drop-shadow-lg" style={{
                textShadow: '0 0 20px rgba(255,255,255,0.5)',
              }}>
                {ticket.ticket_code}
              </p>
              {ticket.batch_id && ticket.quantity_in_batch > 1 && (
                <Badge variant="outline" className="mt-2 border-white/40 text-white bg-white/10 backdrop-blur-sm font-bold">
                  {ticket.ticket_number_in_batch} of {ticket.quantity_in_batch}
                </Badge>
              )}
            </div>
            <div className="relative">
              {/* Animated Glow Border */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-lg blur opacity-75 animate-pulse" />
              <div className="relative bg-white p-3 rounded-lg">
                <QRCodeSVG
                  value={`https://eventtix-psi.vercel.app/validate/${ticket.ticket_code}`}
                  size={80}
                  level="H"
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                />
              </div>
            </div>
          </div>

          {/* Venue QR Code Section */}
          <div className="flex items-center justify-between gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-3">
            <div className="flex-1">
              <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Venue Location
              </p>
              <p className="text-sm font-semibold">
                {ticket.events.venue}
              </p>
              <p className="text-xs opacity-70 mt-1">
                Scan to navigate →
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG
                value={
                  ticket.events.venue.startsWith('http')
                    ? ticket.events.venue
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.events.venue)}`
                }
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