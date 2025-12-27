import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { Ticket } from 'lucide-react';

export const TicketNotificationListener = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Subscribe to NEW tickets
        const channel = supabase
            .channel('ticket_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tickets'
                },
                async (payload) => {
                    try {
                        const newTicket = payload.new as any;

                        if (!newTicket.event_id) return;

                        // Check if this ticket belongs to an event created by the current user
                        // We fetch the event details to verify ownership and get the title
                        const { data: event, error } = await supabase
                            .from('events')
                            .select('user_id, title')
                            .eq('id', newTicket.event_id)
                            .single();

                        if (error || !event) return;

                        // Only notify if the current user is the owner of the event
                        if (event.user_id === user.id) {

                            // Show the popup toast
                            toast("🎉 New Ticket Sold!", {
                                description: `${newTicket.customer_name || 'Someone'} bought a ticket for "${event.title}"`,
                                duration: 6000,
                                icon: <Ticket className="w-5 h-5 text-green-500" />,
                                action: {
                                    label: "View",
                                    onClick: () => window.location.href = `/event/${newTicket.event_id}/tickets`
                                }
                            });

                            // Optional: Play a sound if you add a sound file later
                            // const audio = new Audio('/notification.mp3');
                            // audio.play().catch(() => {});
                        }
                    } catch (err) {
                        console.error('Error processing notification:', err);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null;
};
