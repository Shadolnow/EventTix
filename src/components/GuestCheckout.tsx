import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const guestSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Invalid email address").max(255),
    phone: z.string().trim().min(10, "Valid phone number required").max(20),
    pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d+$/, "PIN must be numbers only")
});

interface GuestCheckoutFormProps {
    eventId: string;
    tierId?: string;
    tierPrice?: number;
    onSuccess: (ticketData: any) => void;
    onCancel?: () => void;
}

export const GuestCheckoutForm = ({
    eventId,
    tierId,
    tierPrice = 0,
    onSuccess,
    onCancel
}: GuestCheckoutFormProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        pin: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const validation = guestSchema.safeParse(formData);
        if (!validation.success) {
            toast.error(validation.error.errors[0].message);
            return;
        }

        setLoading(true);

        try {
            // Generate ticket code
            const generateId = () => {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    return crypto.randomUUID();
                }
                return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
            };

            const section1 = generateId().replace(/-/g, '').substring(0, 8).toUpperCase();
            const section2 = generateId().replace(/-/g, '').substring(0, 8).toUpperCase();
            const ticketCode = `${section1}-${section2}`;

            // Create ticket (guest - no user_id)
            const { data: ticket, error } = await supabase
                .from('tickets')
                .insert({
                    event_id: eventId,
                    ticket_code: ticketCode,
                    attendee_name: formData.name,
                    attendee_email: formData.email.toLowerCase(),
                    attendee_phone: formData.phone,
                    security_pin: formData.pin,
                    ticket_tier_id: tierId || null,
                    payment_status: tierPrice > 0 ? 'pending' : 'paid',
                    payment_method: tierPrice > 0 ? 'pending' : 'free',
                    payment_ref_id: tierPrice > 0 ? null : `FREE_${ticketCode}`
                })
                .select('*, events(*), ticket_tiers(*)')
                .single();

            if (error) throw error;

            toast.success('Ticket booked successfully! 🎉');
            onSuccess(ticket);

            // Reset form
            setFormData({ name: '', email: '', phone: '', pin: '' });

        } catch (error: any) {
            console.error('Guest checkout error:', error);
            toast.error('Booking failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="guest-name">Your Name *</Label>
                <Input
                    id="guest-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                    disabled={loading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="guest-email">Email *</Label>
                <Input
                    id="guest-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                    disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                    Your ticket will be sent here
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="guest-phone">Phone Number *</Label>
                <Input
                    id="guest-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    required
                    disabled={loading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="guest-pin">Set 4-Digit PIN *</Label>
                <Input
                    id="guest-pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, pin: value });
                    }}
                    placeholder="1234"
                    className="text-center text-2xl tracking-widest font-bold"
                    required
                    disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                    🔒 Use this PIN to access your ticket later
                </p>
            </div>

            <div className="flex gap-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading}
                >
                    {loading ? 'Booking...' : tierPrice > 0 ? `Book for ₹${tierPrice}` : 'Claim Free Ticket'}
                </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
                No account required! Just enter your details above.
            </p>
        </form>
    );
};

// Optional Account Creation Prompt (shown after successful guest booking)
interface AccountCreationPromptProps {
    guestEmail: string;
    guestName: string;
    onCreateAccount: () => void;
    onSkip: () => void;
}

export const AccountCreationPrompt = ({
    guestEmail,
    guestName,
    onCreateAccount,
    onSkip
}: AccountCreationPromptProps) => {
    const [open, setOpen] = useState(true);

    const handleSkip = () => {
        setOpen(false);
        onSkip();
    };

    const handleCreate = () => {
        setOpen(false);
        onCreateAccount();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Want to Track Your Tickets?
                    </DialogTitle>
                    <DialogDescription>
                        Create an account to view all your bookings in one place!
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Benefits of Creating Account:</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    ✅ View all your tickets in one dashboard
                                </li>
                                <li className="flex items-center gap-2">
                                    ✅ Get event reminders and updates
                                </li>
                                <li className="flex items-center gap-2">
                                    ✅ Faster checkout next time
                                </li>
                                <li className="flex items-center gap-2">
                                    ✅ Early bird notifications
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">
                            <strong>Pre-filled for you:</strong>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Email: {guestEmail}<br />
                            Name: {guestName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Just set a password and you're done!
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleSkip}
                        >
                            Skip for Now
                        </Button>
                        <Button
                            className="flex-1 gap-2"
                            onClick={handleCreate}
                        >
                            <UserPlus className="w-4 h-4" />
                            Create Account
                        </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                        You can always create an account later from your ticket email
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};
