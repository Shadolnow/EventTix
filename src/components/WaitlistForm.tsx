import { useState } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Clock, CheckCircle2 } from 'lucide-react';

interface WaitlistFormProps {
    eventId: string;
}

export const WaitlistForm = ({ eventId }: WaitlistFormProps) => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('waitlist' as any)
                .insert({
                    event_id: eventId,
                    email: email
                });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.error("You are already on the waitlist!");
                } else {
                    throw error;
                }
            } else {
                setIsSuccess(true);
                toast.success("Joined waitlist successfully!");
            }
        } catch (error) {
            console.error('Waitlist error:', error);
            toast.error("Failed to join waitlist");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-2 border-green-500/30 bg-green-500/5 items-center text-center p-6">
                <CardContent className="space-y-4 pt-6">
                    <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-green-500">You're on the list!</h3>
                        <p className="text-muted-foreground mt-2">
                            We'll notify you at <span className="font-semibold text-foreground">{email}</span> if a spot opens up.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-amber-500/30 bg-amber-500/5 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-amber-500">
                    <Clock className="w-6 h-6" />
                    Event Sold Out
                </CardTitle>
                <CardDescription>
                    Tickets are currently unavailable. Join the waitlist to be notified if spots open up.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="waitlist-email">Email Address</Label>
                        <Input
                            id="waitlist-email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-background/80"
                        />
                    </div>
                    <Button type="submit" variant="secondary" className="mb-[2px]" disabled={isSubmitting}>
                        {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
