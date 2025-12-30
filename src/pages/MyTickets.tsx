import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/safeClient';
import { TicketCard } from '@/components/TicketCard';
import { toast } from 'sonner';
import { Mail, Phone, Search, Ticket as TicketIcon, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HelpDialog } from '@/components/HelpDialog';

const MyTickets = () => {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        // Require ALL 3 factors for security
        if (!email || !phone || !pin) {
            toast.error('All fields required for security', {
                description: 'Enter email, phone number, AND security PIN'
            });
            return;
        }

        if (pin.length < 4) {
            toast.error('Invalid PIN', {
                description: 'PIN must be at least 4 digits'
            });
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            // 3-FACTOR SECURE RPC GATEWAY
            const { data, error } = await supabase.rpc('get_tickets_by_credentials', {
                p_email: email.toLowerCase().trim(),
                p_phone: phone.trim(),
                p_pin: pin.trim()
            });

            if (error) {
                console.error('Query error:', error);
                throw error;
            }

            setTickets(data || []);

            if (data && data.length > 0) {
                toast.success(`✓ Verified! Found ${data.length} ticket${data.length > 1 ? 's' : ''}`, {
                    description: '3-factor authentication successful'
                });
            } else {
                toast.error('No tickets found or invalid credentials', {
                    description: 'Verify your email, phone, and PIN are correct'
                });
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            toast.error('Failed to retrieve tickets');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Lock className="w-8 h-8 text-primary" />
                        <h1 className="text-4xl font-bold text-gradient-cyber">My Tickets</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Secure 3-factor verification required
                    </p>
                </div>

                {/* Security Info Banner */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-primary mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">Enhanced Security Protection</p>
                                <p className="text-xs text-muted-foreground">
                                    For your protection, ticket retrieval requires verification with email, phone number, AND security PIN.
                                    Your PIN was provided when you purchased your tickets.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Search Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Secure Ticket Retrieval
                        </CardTitle>
                        <CardDescription>
                            Enter ALL three details to access your tickets
                        </CardDescription>

                        {/* Help Button */}
                        <div className="mt-2">
                            <HelpDialog
                                title="How to Retrieve Your Tickets"
                                description="Guide to accessing your tickets securely"
                                variant="inline"
                                buttonText="Need help finding your tickets?"
                                sections={[
                                    {
                                        heading: "What You Need",
                                        content: "To retrieve your tickets, you need ALL three pieces of information:",
                                        steps: [
                                            "✉️ Email - The email address you used when purchasing",
                                            "📱 Phone - The phone number you provided",
                                            "🔒 Security PIN - The 4-6 digit PIN you created during purchase"
                                        ]
                                    },
                                    {
                                        heading: "Where to Find Your PIN",
                                        content: "Your security PIN can be found in:",
                                        steps: [
                                            "The success message after ticket purchase",
                                            "The email confirmation sent to you",
                                            "WhatsApp share (if you shared your ticket)"
                                        ]
                                    },
                                    {
                                        heading: "Security Protection",
                                        content: "We use 3-factor authentication to ensure:",
                                        steps: [
                                            "Only YOU can access your tickets",
                                            "Your tickets cannot be stolen or accessed by others",
                                            "Maximum security for your event access"
                                        ]
                                    },
                                    {
                                        heading: "Forgot Your PIN?",
                                        content: "If you can't find your PIN:",
                                        steps: [
                                            "Check your email inbox for the purchase confirmation",
                                            "Look for WhatsApp messages if you shared your ticket",
                                            "Contact support at 7507066880 for assistance"
                                        ]
                                    }
                                ]}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email Address *
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Phone Number *
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="1234567890"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    required
                                />
                            </div>
                        </div>

                        {/* PIN - Full Width */}
                        <div className="space-y-2">
                            <Label htmlFor="pin" className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-primary" />
                                Security PIN *
                            </Label>
                            <Input
                                id="pin"
                                type="password"
                                placeholder="Enter your 4-6 digit PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                maxLength={6}
                                className="text-center text-lg tracking-widest font-mono"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                🔒 Your security PIN was provided when you purchased tickets
                            </p>
                        </div>

                        <Button
                            onClick={handleSearch}
                            disabled={loading || !email || !phone || !pin}
                            className="w-full"
                            size="lg"
                        >
                            {loading ? 'Verifying...' : '🔓 Verify & Access Tickets'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results */}
                {searched && (
                    <div className="space-y-4">
                        {tickets.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Verification Failed</h3>
                                <p className="text-muted-foreground mb-4">
                                    No tickets found with the provided credentials.
                                </p>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Please verify:</p>
                                    <ul className="list-disc list-inside">
                                        <li>Email matches what you used at purchase</li>
                                        <li>Phone number is exactly as entered</li>
                                        <li>Security PIN is correct</li>
                                    </ul>
                                </div>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <TicketIcon className="w-6 h-6 text-primary" />
                                        Your Tickets ({tickets.length})
                                    </h2>
                                    <div className="text-sm text-muted-foreground bg-green-500/10 text-green-600 px-3 py-1.5 rounded-full">
                                        ✓ Verified Secure
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {tickets.map((ticket) => (
                                        <TicketCard
                                            key={ticket.id}
                                            ticket={ticket}
                                            showActions={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Back to Home */}
                <div className="text-center">
                    <Link to="/" className="text-primary hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MyTickets;
