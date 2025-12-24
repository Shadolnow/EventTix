import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/safeClient';
import { TicketCard } from '@/components/TicketCard';
import { toast } from 'sonner';
import { Mail, Phone, Search, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

const MyTickets = () => {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // OTP states
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);

    const handleSendOTP = async () => {
        if (!email && !phone) {
            toast.error('Please enter email or phone number');
            return;
        }

        setLoading(true);

        try {
            // First check if tickets exist for this email/phone
            let query = supabase
                .from('tickets')
                .select('id')
                .is('deleted_at', null);

            if (email) {
                query = query.eq('attendee_email', email.toLowerCase());
            } else if (phone) {
                query = query.eq('attendee_phone', phone);
            }

            const { data: ticketCheck } = await query;

            if (!ticketCheck || ticketCheck.length === 0) {
                toast.error('No tickets found with this information');
                setLoading(false);
                return;
            }

            // Send OTP via Supabase functions
            const { error } = await supabase.functions.invoke('send-otp', {
                body: {
                    email: email || undefined,
                    phone: phone || undefined,
                }
            });

            if (error) {
                throw error;
            }

            setOtpSent(true);
            toast.success('Verification code sent! Check your ' + (email ? 'email' : 'phone'));
        } catch (error) {
            console.error('Error sending OTP:', error);
            toast.error('Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            toast.error('Please enter the 6-digit code');
            return;
        }

        setVerifying(true);

        try {
            // Verify OTP via Supabase functions
            const { data, error } = await supabase.functions.invoke('verify-otp', {
                body: {
                    email: email || undefined,
                    phone: phone || undefined,
                    otp: otp,
                }
            });

            if (error || !data?.valid) {
                throw new Error('Invalid code');
            }

            // OTP verified - now fetch tickets
            setVerified(true);
            await fetchTickets();
            toast.success('Verified! Loading your tickets...');
        } catch (error) {
            console.error('OTP verification error:', error);
            toast.error('Invalid verification code. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const fetchTickets = async () => {
        setSearched(true);

        try {
            let query = supabase
                .from('tickets')
                .select('*, events(*), ticket_tiers(*)')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (email) {
                query = query.eq('attendee_email', email.toLowerCase());
            } else if (phone) {
                query = query.eq('attendee_phone', phone);
            }

            const { data, error } = await query;

            if (error) throw error;

            setTickets(data || []);

            if (data && data.length > 0) {
                toast.success(`Found ${data.length} ticket${data.length > 1 ? 's' : ''}!`);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            toast.error('Failed to retrieve tickets');
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-gradient-cyber">My Tickets</h1>
                    <p className="text-muted-foreground">
                        {verified ? 'Your Tickets' : 'Secure verification required'}
                    </p>
                </div>

                {/* Search/OTP Form */}
                {!verified && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                {otpSent ? 'Enter Verification Code' : 'Find Your Tickets'}
                            </CardTitle>
                            <CardDescription>
                                {otpSent
                                    ? `We sent a 6-digit code to ${email || phone}`
                                    : 'Enter your email or phone number to receive a verification code'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!otpSent ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="your@email.com"
                                                    value={email}
                                                    onChange={(e) => {
                                                        setEmail(e.target.value);
                                                        setPhone('');
                                                    }}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    placeholder="1234567890"
                                                    value={phone}
                                                    onChange={(e) => {
                                                        setPhone(e.target.value);
                                                        setEmail('');
                                                    }}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSendOTP}
                                        disabled={loading || (!email && !phone)}
                                        className="w-full"
                                    >
                                        {loading ? 'Sending Code...' : 'Send Verification Code'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="otp">Verification Code</Label>
                                        <Input
                                            id="otp"
                                            type="text"
                                            placeholder="000000"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="text-center text-2xl tracking-widest font-mono"
                                            maxLength={6}
                                        />
                                        <p className="text-sm text-muted-foreground text-center">
                                            Enter the 6-digit code sent to {email || phone}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setOtpSent(false);
                                                setOtp('');
                                            }}
                                            className="flex-1"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleVerifyOTP}
                                            disabled={verifying || otp.length !== 6}
                                            className="flex-1"
                                        >
                                            {verifying ? 'Verifying...' : 'Verify & Access Tickets'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                {verified && searched && (
                    <div className="space-y-4">
                        {tickets.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Ticket className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-xl font-semibold mb-2">No Tickets Found</h3>
                                <p className="text-muted-foreground mb-4">
                                    We couldn't find any tickets with the provided information.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Make sure you're using the same email or phone number you used when claiming tickets.
                                </p>
                            </Card>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">
                                        Your Tickets ({tickets.length})
                                    </h2>
                                </div>

                                <div className="grid gap-6">
                                    {tickets.map((ticket) => (
                                        <TicketCard
                                            key={ticket.id}
                                            ticket={ticket}
                                            showActions={true}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Back Button */}
                <div className="text-center pt-8">
                    <Link to="/">
                        <Button variant="ghost">
                            ← Back to Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MyTickets;
