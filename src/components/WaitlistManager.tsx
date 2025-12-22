import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const WaitlistManager = ({ eventId }: { eventId: string }) => {
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWaitlist = async () => {
            const { data, error } = await supabase
                .from('waitlist' as any)
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: true }); // First come first serve

            if (error) {
                console.error(error);
            } else {
                setWaitlist(data || []);
            }
            setLoading(false);
        };
        fetchWaitlist();
    }, [eventId]);

    const handleNotify = (email: string) => {
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 1000)),
            {
                loading: 'Sending notification...',
                success: `Notification email sent to ${email}`,
                error: 'Failed to send'
            }
        );
        // In real app: call Edge Function to send email
    };

    return (
        <Card className="border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Waitlist Management
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div>Loading...</div>
                ) : waitlist.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No one is on the waitlist yet.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Joined At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {waitlist.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.email}</TableCell>
                                    <TableCell>{format(new Date(item.created_at), 'PPP p')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => handleNotify(item.email)}>
                                            <Mail className="w-4 h-4 mr-2" /> Send Alert
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
