import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, ShoppingCart, Trash2, Copy, ArrowLeft, Download, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { TicketCard } from './TicketCard';
import { HelpDialog } from './HelpDialog';

interface BulkTicketTabProps {
    eventId: string;
    event: any;
    onSuccess: (tickets: any[]) => void;
}

export const BulkTicketTab = ({ eventId, event, onSuccess }: BulkTicketTabProps) => {
    const [tiers, setTiers] = useState<any[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        securityPin: '' // Customer sets their own PIN
    });
    const [loading, setLoading] = useState(false);
    const [tiersLoaded, setTiersLoaded] = useState(false);
    const [showUpiPayment, setShowUpiPayment] = useState(false);
    const [upiReference, setUpiReference] = useState(''); // UPI transaction reference
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);

    // Load tiers
    const loadTiers = async () => {
        if (tiersLoaded) return;

        const { data, error } = await supabase
            .from('ticket_tiers')
            .select('*')
            .eq('event_id', eventId)
            .eq('is_active', true)
            .order('sort_order');

        if (data && !error) {
            setTiers(data);
            setTiersLoaded(true);
        }
    };

    // Update quantity
    const updateQuantity = (tierId: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[tierId] || 0;
            const newQty = Math.max(0, Math.min(50, current + delta));
            if (newQty === 0) {
                const { [tierId]: removed, ...rest } = prev;
                return rest;
            }
            return { ...prev, [tierId]: newQty };
        });
    };

    // Calculate totals
    const calculateTotal = () => {
        return Object.entries(quantities).reduce((sum, [tierId, qty]) => {
            const tier = tiers.find(t => t.id === tierId);
            return sum + (tier?.price || 0) * qty;
        }, 0);
    };

    const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    const total = calculateTotal();

    // Create bulk tickets
    const handlePurchase = async (paymentMethod: 'upi' | 'cash') => {
        // Validation
        if (!formData.name || !formData.email || !formData.phone) {
            toast.error('Please fill in all your details');
            return;
        }

        if (!formData.securityPin || formData.securityPin.length < 4) {
            toast.error('Security PIN required (minimum 4 digits)');
            return;
        }

        if (!/^\d{4,6}$/.test(formData.securityPin)) {
            toast.error('PIN must be 4-6 digits only');
            return;
        }

        if (totalItems === 0) {
            toast.error('Please select at least one ticket');
            return;
        }

        try {
            setLoading(true);
            const createdTickets = [];

            // Generate a unique batch ID for this bulk purchase
            const batchId = crypto.randomUUID();

            // Use customer's security PIN (already validated)
            const securityPin = formData.securityPin;

            let ticketNumberInBatch = 1;

            // Create tickets for each tier quantity
            for (const [tierId, quantity] of Object.entries(quantities)) {
                for (let i = 0; i < quantity; i++) {
                    const ticketCode = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

                    const status = event.is_free ? 'paid' : 'pending';
                    const refId = paymentMethod === 'upi'
                        ? (upiReference.trim() || `UPI_${Date.now()}_${i}`) // Use customer's UPI ref if provided
                        : `CASH_${Date.now()}_${i}`;

                    const { data, error } = await supabase
                        .from('tickets')
                        .insert({
                            event_id: eventId,
                            attendee_name: formData.name,
                            attendee_phone: formData.phone,
                            attendee_email: formData.email.toLowerCase(),
                            ticket_code: ticketCode,
                            tier_id: tierId,
                            payment_ref_id: refId,
                            payment_status: status,
                            payment_method: paymentMethod,
                            // Batch tracking fields
                            batch_id: batchId,
                            quantity_in_batch: totalItems,
                            ticket_number_in_batch: ticketNumberInBatch++,
                            // SECURITY: Add PIN for 3-factor retrieval verification
                            security_pin: securityPin
                        })
                        .select()
                        .single();

                    if (data && !error) {
                        createdTickets.push(data);
                    } else {
                        console.error('Error creating ticket:', error);
                    }
                }
            }

            if (createdTickets.length === 0) {
                throw new Error('Failed to create any tickets');
            }

            // Fetch created tickets with event data for proper display
            const { data: ticketsWithEvent, error: fetchError } = await supabase
                .from('tickets')
                .select('*, events(*), ticket_tiers(*)')
                .in('id', createdTickets.map(t => t.id));

            if (fetchError) {
                console.error('Error fetching tickets:', fetchError);
            }

            const finalTickets = ticketsWithEvent || createdTickets;

            // Send emails for created tickets with detailed logging
            console.log('🎫 Attempting to send emails for', finalTickets.length, 'tickets');

            Promise.allSettled(finalTickets.map(async (ticket) => {
                console.log('📧 Sending email for ticket:', ticket.ticket_code);

                try {
                    const result = await supabase.functions.invoke('send-ticket-email', {
                        body: {
                            to: formData.email,
                            ticketCode: ticket.ticket_code,
                            attendeeName: formData.name,
                            eventTitle: event.title,
                            eventDate: event.event_date,
                            eventVenue: event.venue,
                            ticketUrl: `${window.location.origin}/ticket/${ticket.id}`
                        }
                    });

                    console.log('✅ Email result for', ticket.ticket_code, ':', result);
                    return result;
                } catch (error) {
                    console.error('❌ Email error for', ticket.ticket_code, ':', error);
                    throw error;
                }
            })).then(results => {
                const successful = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;

                console.log('📊 Email sending complete:', { successful, failed, total: results.length });

                // Don't show email status - focus on ticket creation
            });

            // Success!
            toast.success(`🎉 ${finalTickets.length} tickets created successfully!`);

            // Confetti
            confetti({
                particleCount: 200,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00E5FF', '#B400FF', '#FFFFFF']
            });

            // IMPORTANT: Display customer's chosen Security PIN
            toast.success(`🔒 Your Security PIN: ${securityPin}`, {
                description: 'SAVE THIS! You chose this PIN - need it with email & phone to retrieve tickets.',
                duration: 15000, // Show for 15 seconds
                action: {
                    label: 'Copy PIN',
                    onClick: () => {
                        navigator.clipboard.writeText(securityPin);
                        toast.success('PIN copied to clipboard!');
                    }
                }
            });

            // Store tickets and show success dialog
            setPurchasedTickets(finalTickets);
            setQuantities({});
            setFormData({ name: '', email: '', phone: '', securityPin: '' });
            setUpiReference(''); // Reset UPI reference
            setShowSuccessDialog(true);

            // Note: We don't call onSuccess yet, we wait for user to close dialog

        } catch (error: any) {
            console.error('Bulk ticket error:', error);
            toast.error('Failed to create tickets: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Load tiers on mount
    if (!tiersLoaded) {
        loadTiers();
    }

    if (tiers.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No ticket tiers available for bulk purchase</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Help Button */}
            <HelpDialog
                title="How to Purchase Bulk Tickets"
                description="Step-by-step guide for buying multiple tickets"
                variant="button"
                buttonText="📖 Need Help? Click Here"
                className="w-full"
                sections={[
                    {
                        heading: "Enter Your Details",
                        content: "Start by providing your information and creating a security PIN",
                        steps: [
                            "Fill in your Name, Email, and Phone",
                            "Create a 4-6 digit Security PIN (you choose it!)",
                            "⚠️ Remember this PIN - you'll need it to retrieve your tickets"
                        ]
                    },
                    {
                        heading: "Select Tickets",
                        content: "Choose ticket types and quantities using + / - buttons"
                    },
                    {
                        heading: "Payment",
                        content: "Choose your preferred payment method:",
                        steps: [
                            "UPI: Scan QR code → Pay → Enter UPI reference → Click 'I've Paid'",
                            "Cash: Pay at venue → Tickets created instantly"
                        ]
                    },
                    {
                        heading: "Retrieve Your Tickets Anytime",
                        content: "Visit 'My Tickets' page and enter:",
                        steps: [
                            "✅ Your Email",
                            "✅ Your Phone Number",
                            "✅ Your Security PIN (the one you created)",
                            "3-factor security ensures only YOU can access your tickets!"
                        ]
                    }
                ]}
            />

            {/* Customer Details */}
            {!showUpiPayment && (
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-bold text-lg">Your Details</h3>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <Label htmlFor="bulk-name">Full Name *</Label>
                                <Input
                                    id="bulk-name"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="bulk-email">Email *</Label>
                                <Input
                                    id="bulk-email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="bulk-phone">Phone *</Label>
                                <Input
                                    id="bulk-phone"
                                    placeholder="+91 9876543210"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Security PIN Field */}
                        <div className="mt-4">
                            <Label htmlFor="bulk-pin" className="text-primary font-semibold">
                                🔒 Security PIN (4-6 digits) *
                            </Label>
                            <Input
                                id="bulk-pin"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="Enter your 4-6 digit PIN"
                                value={formData.securityPin}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, ''); // Only digits
                                    setFormData({ ...formData, securityPin: value });
                                }}
                                className="text-center text-2xl tracking-widest font-bold"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                ⚠️ <strong>Important:</strong> You'll need this PIN + email + phone to retrieve your tickets later. Choose a memorable PIN!
                            </p>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            All tickets will be registered under this name and sent to this email.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Ticket Selection */}
            {!showUpiPayment && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg">Select Tickets</h3>

                    {tiers.map(tier => {
                        const qty = quantities[tier.id] || 0;
                        const available = tier.capacity ? tier.capacity - (tier.tickets_sold || 0) : 999;

                        return (
                            <Card key={tier.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Tier Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg">{tier.name}</h4>
                                                {tier.original_price && tier.original_price > tier.price && (
                                                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                                                        Save ₹{tier.original_price - tier.price}
                                                    </Badge>
                                                )}
                                            </div>

                                            {tier.description && (
                                                <p className="text-sm text-muted-foreground mb-2">{tier.description}</p>
                                            )}

                                            <div className="flex items-baseline gap-2">
                                                {tier.original_price && (
                                                    <span className="text-sm line-through text-muted-foreground">₹{tier.original_price}</span>
                                                )}
                                                <span className="text-xl font-bold text-primary">₹{tier.price}</span>
                                                <span className="text-xs text-muted-foreground">per ticket</span>
                                            </div>

                                            {available < 20 && available > 0 && (
                                                <p className="text-xs text-amber-500 mt-1">Only {available} left!</p>
                                            )}
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-9 w-9 rounded-full"
                                                    onClick={() => updateQuantity(tier.id, -1)}
                                                    disabled={qty === 0}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>

                                                <div className="w-16 text-center">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={Math.min(50, available)}
                                                        value={qty}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setQuantities(prev => ({ ...prev, [tier.id]: Math.max(0, Math.min(50, val)) }));
                                                        }}
                                                        className="text-center text-lg font-bold h-9"
                                                    />
                                                </div>

                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-9 w-9 rounded-full"
                                                    onClick={() => updateQuantity(tier.id, 1)}
                                                    disabled={qty >= Math.min(50, available)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>

                                                {qty > 0 && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9"
                                                        onClick={() => setQuantities(prev => {
                                                            const { [tier.id]: removed, ...rest } = prev;
                                                            return rest;
                                                        })}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>

                                            {qty > 0 && (
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Subtotal</p>
                                                    <p className="text-lg font-bold">₹{tier.price * qty}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Cart Summary & Checkout */}
            {totalItems > 0 && !showUpiPayment && (
                <Card className="sticky bottom-4 border-2 border-primary/30 shadow-2xl bg-gradient-to-r from-card to-primary/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="h-8 w-8 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{totalItems} ticket{totalItems > 1 ? 's' : ''}</p>
                                    <p className="text-3xl font-black">₹{total}</p>
                                </div>
                            </div>
                        </div>

                        {!event.is_free && (
                            <div className="grid gap-3 md:grid-cols-2">
                                <Button
                                    onClick={() => {
                                        if (!formData.name || !formData.email || !formData.phone) {
                                            toast.error('Please fill in all your details');
                                            return;
                                        }
                                        if (totalItems === 0) {
                                            toast.error('Please select at least one ticket');
                                            return;
                                        }
                                        setShowUpiPayment(true);
                                    }}
                                    disabled={loading}
                                    className="h-12 flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                >
                                    {loading ? 'Processing...' : '💳 Proceed to Payment'}
                                </Button>

                                <Button
                                    onClick={() => handlePurchase('cash')}
                                    disabled={loading}
                                    variant="outline"
                                    className="h-12 border-2"
                                >
                                    {loading ? 'Processing...' : '💵 Pay Cash at Venue'}
                                </Button>
                            </div>
                        )}

                        {event.is_free && (
                            <Button
                                onClick={() => handlePurchase('upi')}
                                disabled={loading}
                                className="w-full h-12 bg-gradient-to-r from-primary to-accent"
                            >
                                {loading ? 'Processing...' : '🎉 Get Free Tickets'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {totalItems === 0 && !showUpiPayment && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">Select tickets using the +/- buttons above</p>
                    </CardContent>
                </Card>
            )}

            {/* UPI Payment Screen */}
            {showUpiPayment && (
                <Card className="border-2 border-green-500/30 shadow-2xl">
                    <CardContent className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <span className="text-2xl">💳</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">UPI Payment</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Total: ₹{total} for {totalItems} ticket{totalItems > 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowUpiPayment(false)}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* QR Code */}
                        {event.qr_code_url && (
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 blur-xl rounded-2xl" />
                                    <img
                                        src={event.qr_code_url}
                                        alt="UPI QR Code"
                                        className="relative w-64 h-64 object-contain rounded-2xl border-2 border-border bg-white p-4"
                                    />
                                </div>
                            </div>
                        )}

                        {/* UPI ID */}
                        {event.upi_id && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Or pay using UPI ID</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={event.upi_id}
                                        readOnly
                                        className="font-mono text-base"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(event.upi_id);
                                            toast.success('UPI ID copied!');
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <p className="text-xs font-semibold">How to complete payment:</p>
                            <div className="space-y-1.5 text-xs text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                                    <span>Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                                    <span>Scan the QR code or enter the UPI ID manually</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                                    <span>Pay ₹{total} and complete the payment</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                                    <span><strong>Copy your UPI transaction ID</strong> and paste it below (recommended)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">5</span>
                                    <span>Click "I've Paid" to generate your tickets</span>
                                </div>
                            </div>
                        </div>

                        {/* UPI Reference Input */}
                        <div className="space-y-2">
                            <Label htmlFor="upi-ref" className="text-sm font-semibold">
                                UPI Transaction Reference (Optional but Recommended)
                            </Label>
                            <Input
                                id="upi-ref"
                                type="text"
                                placeholder="e.g., 434512345678 or UPI/CR/..."
                                value={upiReference}
                                onChange={(e) => setUpiReference(e.target.value)}
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 <strong>Enter your UPI transaction ID</strong> for faster verification. Find it in your payment app after completing payment.
                            </p>
                        </div>

                        {/* Confirm Button */}
                        <Button
                            onClick={() => handlePurchase('upi')}
                            disabled={loading}
                            className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        >
                            {loading ? 'Creating Tickets...' : '✅ I\'ve Paid - Create Tickets'}
                        </Button>

                        {/* Contact Info */}
                        <p className="text-xs text-center text-muted-foreground">
                            💡 Call <span className="font-semibold text-primary">7507066880</span> to confirm or wait for verification
                        </p>
                    </CardContent>
                </Card>
            )}
            {/* Success Dialog - Show All Tickets */}
            <Dialog open={showSuccessDialog} onOpenChange={(open) => {
                if (!open && purchasedTickets.length > 0) {
                    onSuccess(purchasedTickets);
                }
                setShowSuccessDialog(open);
            }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] border-2 border-primary/20">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-center text-primary">
                            🎉 {purchasedTickets.length} Ticket{purchasedTickets.length > 1 ? 's' : ''} Created!
                        </DialogTitle>
                        <DialogDescription className="text-center pt-2 text-base">
                            All tickets sent to {formData.email || 'your email'}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[55vh] pr-4">
                        <div className="space-y-4 py-2">
                            {purchasedTickets.map((ticket) => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    compact={false}
                                    showActions={true}
                                />
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="space-y-3 pt-2">
                        {/* Security PIN Reminder */}
                        <div className="p-4 border-2 border-primary/30 bg-primary/10 rounded-lg space-y-2">
                            <p className="font-bold text-base text-foreground flex items-center gap-2">
                                <span className="text-2xl">🔒</span>
                                Your Security PIN: <span className="text-2xl tracking-widest font-mono text-primary">{purchasedTickets[0]?.security_pin || '****'}</span>
                            </p>
                            <div className="text-sm text-foreground/90 space-y-1 ml-9">
                                <p>✓ <strong>You chose this PIN!</strong> Save it to retrieve tickets later</p>
                                <p>✓ Required: <strong>Email + Phone + PIN</strong> to access tickets</p>
                                <p>✓ PIN is <strong>automatically included</strong> when sharing via WhatsApp</p>
                                <p>✓ Also sent to your email for safekeeping</p>
                            </div>
                        </div>

                        {/* Simple Help Section */}
                        <div className="p-4 border border-green-500/20 bg-green-500/5 rounded-lg space-y-2">
                            <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <span className="text-lg">ℹ️</span>
                                How Your Tickets Work:
                            </p>
                            <div className="text-sm text-muted-foreground space-y-1.5 ml-7">
                                <p>✓ <strong>Each person gets their own QR code</strong> - Share tickets individually</p>
                                <p>✓ <strong>Numbers like "1 of 3"</strong> show this is a group booking</p>
                                <p>✓ <strong>All tickets work independently</strong> - No need to arrive together</p>
                                <p>✓ <strong>Check your email</strong> - Each ticket sent separately for easy forwarding</p>
                            </div>
                        </div>

                        <div className="p-3 border border-blue-500/20 bg-blue-500/10 rounded-lg flex gap-3 text-sm">
                            <span className="text-xl">💡</span>
                            <p className="text-foreground">Scroll up to see all tickets. Each person gets their own QR code!</p>
                        </div>

                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground mb-1">Need help?</p>
                            <a href="tel:7507066880" className="text-lg font-bold text-primary hover:underline">
                                📞 7507066880
                            </a>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            className="w-full"
                            onClick={() => {
                                setShowSuccessDialog(false);
                                window.print();
                            }}
                            variant="outline"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Print All Tickets
                        </Button>
                        <Button
                            className="w-full"
                            onClick={() => setShowSuccessDialog(false)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
