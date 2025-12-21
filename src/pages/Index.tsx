import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Ticket, QrCode, Sparkles, LogOut, Shield, Building2, Menu, X, ChevronRight, Zap, Users, BarChart3 } from 'lucide-react';
import heroImage from '@/assets/eventtix-hero.jpg';
import { supabase } from '@/integrations/supabase/safeClient';
import { cn } from '@/lib/utils';

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Ticket className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <span className="text-xl md:text-2xl font-bold text-gradient-cyber">EventTix</span>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="border-primary/30 hover:border-primary">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/events">
                  <Button variant="ghost" size="sm">My Events</Button>
                </Link>
                <Link to="/global-tickets">
                  <Button variant="ghost" size="sm">Tickets</Button>
                </Link>
                <Link to="/create-event">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon-cyan">
                    Create Event
                  </Button>
                </Link>
                <Link to="/scan">
                  <Button variant="ghost" size="icon">
                    <QrCode className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-destructive">
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/pricing">
                  <Button variant="ghost" size="sm">
                    <Building2 className="w-4 h-4 mr-2" />
                    For Business
                  </Button>
                </Link>
                <Link to="/public-events">
                  <Button variant="ghost" size="sm">Browse Events</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon-cyan">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-transform"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          "md:hidden overflow-hidden transition-all duration-300 border-t border-border/50",
          menuOpen ? "max-h-96" : "max-h-0"
        )}>
          <div className="container mx-auto px-4 py-4 space-y-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center justify-between p-3 rounded-xl bg-muted/30 active:scale-[0.98] transition-transform">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <span>Admin Panel</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                )}
                <Link to="/events" className="flex items-center justify-between p-3 rounded-xl bg-muted/30 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-primary" />
                    <span>My Events</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
                <Link to="/global-tickets" className="flex items-center justify-between p-3 rounded-xl bg-muted/30 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-primary" />
                    <span>All Tickets</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
                <Link to="/create-event" className="block">
                  <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon-cyan">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Event
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-12" onClick={() => signOut()}>
                  <LogOut className="w-5 h-5 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/public-events" className="flex items-center justify-between p-3 rounded-xl bg-muted/30 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-primary" />
                    <span>Browse Events</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
                <Link to="/pricing" className="flex items-center justify-between p-3 rounded-xl bg-muted/30 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span>For Business</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
                <Link to="/auth" className="block">
                  <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon-cyan">
                    Get Started
                  </Button>
                </Link>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full h-12">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile First */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-10 left-0 w-64 md:w-96 h-64 md:h-96 bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-0 w-64 md:w-96 h-64 md:h-96 bg-accent/20 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content - Mobile First */}
            <div className="space-y-6 md:space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                <Zap className="w-4 h-4" />
                <span>Trusted by 10,000+ event organizers</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                <span className="text-gradient-cyber">
                  Digital Tickets
                </span>
                <br />
                <span className="text-foreground">For The Future</span>
              </h1>
              
              <p className="text-base md:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Create stunning event tickets with QR codes. Secure, beautiful, and easy to validate.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link to={user ? "/create-event" : "/auth"} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base md:text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground border-0 shadow-neon-cyan active:scale-[0.98] transition-transform">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Event
                  </Button>
                </Link>
                <Link to="/public-events" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-base md:text-lg border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 active:scale-[0.98] transition-transform">
                    Browse Events
                  </Button>
                </Link>
              </div>

              {/* Stats - Mobile Horizontal Scroll */}
              <div className="flex gap-6 md:gap-8 justify-center lg:justify-start pt-4 md:pt-6">
                <div className="text-center lg:text-left">
                  <p className="text-2xl md:text-3xl font-bold text-foreground">50K+</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Events Created</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-2xl md:text-3xl font-bold text-foreground">2M+</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Tickets Issued</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-2xl md:text-3xl font-bold text-foreground">99.9%</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Uptime</p>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative group order-first lg:order-last">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl md:rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
              <img
                src={heroImage}
                alt="Digital event tickets"
                className="relative w-full rounded-2xl md:rounded-3xl border border-border/50 shadow-2xl transform transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Mobile First */}
      <section className="py-16 md:py-20 bg-muted/30 backdrop-blur-sm border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              <span className="text-gradient-cyber">Everything You Need</span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              Powerful features to manage your events from start to finish
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {[
              {
                icon: Ticket,
                title: "Flexible Ticketing",
                description: "Create free or paid events with multiple ticket tiers. VIP, Early Bird, or General Admission.",
                color: "primary"
              },
              {
                icon: QrCode,
                title: "Secure Validation",
                description: "Every ticket gets a unique, encrypted QR code. Scan and validate instantly.",
                color: "accent"
              },
              {
                icon: Shield,
                title: "Fraud Protection",
                description: "Prevent duplicate entries and fake tickets. Real-time sync ensures each ticket is used once.",
                color: "secondary"
              },
              {
                icon: Users,
                title: "Attendee Management",
                description: "Track check-ins, manage guest lists, and export attendee data with ease.",
                color: "primary"
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                description: "Monitor ticket sales, revenue, and attendance patterns with live dashboards.",
                color: "accent"
              },
              {
                icon: Zap,
                title: "Instant Delivery",
                description: "Tickets delivered instantly via email with automatic reminders before the event.",
                color: "secondary"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="p-5 md:p-6 lg:p-8 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 group active:scale-[0.98]"
              >
                <div className={cn(
                  "w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 md:mb-6 transition-colors",
                  feature.color === "primary" && "bg-primary/10 group-hover:bg-primary/20",
                  feature.color === "accent" && "bg-accent/10 group-hover:bg-accent/20",
                  feature.color === "secondary" && "bg-secondary/10 group-hover:bg-secondary/20"
                )}>
                  <feature.icon className={cn(
                    "w-5 h-5 md:w-6 md:h-6",
                    feature.color === "primary" && "text-primary",
                    feature.color === "accent" && "text-accent",
                    feature.color === "secondary" && "text-secondary"
                  )} />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-foreground">{feature.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticket Options - Mobile Horizontal Scroll */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 text-foreground">
              Choose Your Experience
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Support for all ticket types and pass configurations
            </p>
          </div>
          
          {/* Horizontal scroll on mobile */}
          <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto pb-4 md:pb-0 -mx-4 px-4 md:mx-0 snap-x snap-mandatory scrollbar-hide">
            {/* Standard Pass */}
            <div className="min-w-[280px] md:min-w-0 snap-center relative p-5 md:p-6 rounded-2xl border border-border/50 bg-card/50 hover:border-muted-foreground/30 transition-all duration-300 active:scale-[0.98]">
              <div className="absolute top-0 left-0 w-full h-1 bg-muted-foreground/50 rounded-t-2xl" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">General Admission</h3>
                  <p className="text-sm text-muted-foreground">Standard Access</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">FREE</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />Entry to main event</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />Digital QR Ticket</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />Standard Support</li>
              </ul>
              <Button variant="outline" className="w-full h-11 border-border/50 hover:bg-muted/50">Select Option</Button>
            </div>

            {/* VIP Pass */}
            <div className="min-w-[280px] md:min-w-0 snap-center relative p-5 md:p-6 rounded-2xl border border-accent/30 bg-accent/5 hover:border-accent/50 transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,0.1)] active:scale-[0.98]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-secondary rounded-t-2xl" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">VIP Access</h3>
                  <p className="text-sm text-accent">Premium Experience</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent">₹2,499</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Priority Entry</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Backstage Access</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Exclusive Merch</li>
              </ul>
              <Button className="w-full h-11 bg-gradient-to-r from-accent to-secondary hover:opacity-90 text-accent-foreground border-0">Select Option</Button>
            </div>

            {/* Season Pass */}
            <div className="min-w-[280px] md:min-w-0 snap-center relative p-5 md:p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary/50 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.1)] active:scale-[0.98]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent rounded-t-2xl" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Season Pass</h3>
                  <p className="text-sm text-primary">All Access</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">₹9,999</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Unlimited Events</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Guest Passes (x2)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />24/7 Concierge</li>
              </ul>
              <Button variant="outline" className="w-full h-11 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50">Select Option</Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 border border-primary/20 p-8 md:p-12 lg:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                Ready to create your first event?
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Join thousands of event organizers who trust EventTix for their ticketing needs.
              </p>
              <Link to={user ? "/create-event" : "/auth"}>
                <Button size="lg" className="h-14 px-8 text-base md:text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon-cyan active:scale-[0.98] transition-transform">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
