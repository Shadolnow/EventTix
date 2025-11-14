import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Ticket, QrCode, Sparkles, LogOut, ExternalLink, Shield } from 'lucide-react';
import heroImage from '@/assets/eventtix-hero.jpg';
import eventtixLogoUrl from '@/assets/eventtix-logo.svg';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const PUBLIC_BASE_URL = (import.meta as any).env?.VITE_PUBLIC_SITE_URL || window.location.origin;
  const qrRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });
        setIsAdmin(data || false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/public-events');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-primary/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ticket className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-gradient-cyber">EventTix</span>
          </div>
          <nav className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/dashboard">
                <Button variant="outline" className="border-primary/50 hover:border-primary">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            <Link to="/events">
              <Button variant="ghost">My Events</Button>
            </Link>
            <Link to="/create-event">
              <Button variant="neon">Create Event</Button>
            </Link>
            <Link to="/scan">
              <Button variant="ghost">
                <QrCode className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-gradient-cyber">Digital Tickets</span>
                <br />
                <span className="text-foreground">For The Future</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Create stunning event tickets with QR codes. Secure, beautiful, and easy to validate.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/create-event">
                  <Button variant="cyber" size="xl" className="group">
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Create Event
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="neon" size="xl">
                    View Events
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 blur-3xl animate-pulse-slow" />
              <img
                src={heroImage}
                alt="Digital event tickets"
                className="relative rounded-xl shadow-neon-cyan border-2 border-primary/30 animate-float"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-primary/20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            <span className="text-gradient-cyber">Features</span>
          </h2>
          
          {/* Public Events QR Code Card */}
          <Card className="max-w-md mx-auto mb-12 border-2 border-primary/30 bg-gradient-to-br from-card to-card/80">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Share Public Events Page</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
            <QRCodeSVG
              value={`${PUBLIC_BASE_URL}/public-events`}
                  size={200}
                  level="H"
                  includeMargin
                  className="border-4 border-primary/20 rounded-lg p-2 bg-white"
                  ref={qrRef as any}
                />
                {/* Centered overlay logo with white rounded backing to preserve QR module contrast */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="rounded-lg bg-white/95 p-1 shadow-sm">
                    <img src={eventtixLogoUrl} alt="EventTix logo" className="h-12 w-12 object-contain" />
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Anyone can scan this QR code to view all your events
              </p>
              <p className="text-center text-sm mt-1">
          <a
            href={`${PUBLIC_BASE_URL}/public-events`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
                >
                  Click here to go to the event page
                </a>
              </p>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
          const url = `${PUBLIC_BASE_URL}/public-events`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
          const url = `${PUBLIC_BASE_URL}/public-events`;
                    window.open(url, '_blank', 'noopener');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Page
                </Button>
              </div>
              {/* Download controls: SVG, PNG, PDF */}
              <div className="flex gap-2 w-full mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const svgEl = qrRef.current;
                    if (!svgEl) return;
                    const serializer = new XMLSerializer();
                    const svgString = serializer.serializeToString(svgEl);
                    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'eventtix-public-events-qr.svg';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download SVG
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    const svgEl = qrRef.current;
                    if (!svgEl) return;
                    const serializer = new XMLSerializer();
                    const svgString = serializer.serializeToString(svgEl);
                    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      // Add 10% quiet zone around exported PNG
                      const qSize = 220; // approximate drawing size
                      const quiet = Math.round(qSize * 0.10);
                      canvas.width = qSize + quiet * 2;
                      canvas.height = qSize + quiet * 2;
                      const ctx = canvas.getContext('2d')!;
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.drawImage(img, quiet, quiet, qSize, qSize);
                      const pngUrl = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = pngUrl;
                      a.download = 'eventtix-public-events-qr.png';
                      a.click();
                      URL.revokeObjectURL(url);
                    };
                    img.onerror = () => URL.revokeObjectURL(url);
                    img.src = url;
                  }}
                >
                  Download PNG
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const { jsPDF } = await import('jspdf');
                      const svgEl = qrRef.current;
                      if (!svgEl) return;
                      const serializer = new XMLSerializer();
                      const svgString = serializer.serializeToString(svgEl);
                      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                      const url = URL.createObjectURL(svgBlob);
                      const img = new Image();
                      img.onload = () => {
                        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
                        const pageW = pdf.internal.pageSize.getWidth();
                        const qSize = 300; // printed size in points
                        const quiet = Math.round(qSize * 0.10);
                        const x = (pageW - (qSize + quiet * 2)) / 2;
                        // Draw white background (quiet zone)
                        pdf.setFillColor(255, 255, 255);
                        pdf.rect(x, 72, qSize + quiet * 2, qSize + quiet * 2, 'F');
                        pdf.addImage(img, 'PNG', x + quiet, 72 + quiet, qSize, qSize);
                        pdf.text('EventTix – Public Events QR', x, 72 + qSize + quiet * 2 + 24);
                        pdf.save('eventtix-public-events-qr.pdf');
                        URL.revokeObjectURL(url);
                      };
                      img.onerror = () => URL.revokeObjectURL(url);
                      img.src = url;
                    } catch (e) {
                      toast.error('PDF export requires jspdf. Please run: npm install jspdf');
                    }
                  }}
                >
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors hover:shadow-neon-cyan">
              <Ticket className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Custom Tickets</h3>
              <p className="text-muted-foreground">
                Design beautiful digital tickets with your event details, dates, and promotions.
              </p>
            </div>
            <div className="p-6 rounded-xl border-2 border-accent/20 hover:border-accent/40 transition-colors hover:shadow-neon-cyan">
              <QrCode className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-2">QR Validation</h3>
              <p className="text-muted-foreground">
                Secure QR codes that can be validated instantly at your event entrance.
              </p>
            </div>
            <div className="p-6 rounded-xl border-2 border-secondary/20 hover:border-secondary/40 transition-colors hover:shadow-neon-magenta">
              <Sparkles className="w-12 h-12 text-secondary mb-4" />
              <h3 className="text-xl font-bold mb-2">Global Ready</h3>
              <p className="text-muted-foreground">
                Create events for any location worldwide with full customization options.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;