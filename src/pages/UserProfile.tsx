import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { TicketCard } from '@/components/TicketCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Ticket, Heart, Settings, LogOut, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const UserProfile = () => {
    const { user, signOut, profile, isOrganizer, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [myTickets, setMyTickets] = useState<any[]>([]);
    const [savedEvents, setSavedEvents] = useState<any[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [loadingSaved, setLoadingSaved] = useState(false);

    useEffect(() => {
        if (user) {
            fetchMyTickets();
            fetchSavedEvents();
        }
    }, [user]);

    const fetchMyTickets = async () => {
        if (!user?.email) return;
        setLoadingTickets(true);
        try {
            // Find tickets by email (approximate ownership for now)
            // Ideally should link by user_id if tickets table has it, but it relies on filters usually
            const { data, error } = await supabase
                .from('tickets')
                .select('*, events(*), ticket_tiers(*)')
                .ilike('attendee_email', user.email)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMyTickets(data || []);
        } catch (err) {
            console.error('Error fetching tickets', err);
        } finally {
            setLoadingTickets(false);
        }
    };

    const fetchSavedEvents = async () => {
        setLoadingSaved(true);
        try {
            // Load from LocalStorage for now
            const savedIds = JSON.parse(localStorage.getItem('saved_event_ids') || '[]');

            if (savedIds.length === 0) {
                setSavedEvents([]);
                return;
            }

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .in('id', savedIds);

            if (error) throw error;
            setSavedEvents(data || []);
        } catch (err) {
            console.error('Error fetching saved events', err);
        } finally {
            setLoadingSaved(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p>Please login to view profile</p>
                <Button onClick={() => navigate('/auth')} className="mt-4">Login</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 bg-background pb-20">
            <div className="container mx-auto max-w-4xl space-y-6">

                {/* Profile Header */}
                <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                        <Avatar className="w-24 h-24 border-2 border-primary">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                            <AvatarFallback>{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 text-center md:text-left space-y-2">
                            <h1 className="text-2xl font-bold">{user.user_metadata?.full_name || 'User'}</h1>
                            <p className="text-muted-foreground">{user.email}</p>
                            <div className="flex gap-2 justify-center md:justify-start">
                                {isAdmin && <Badge variant="default">Admin</Badge>}
                                {isOrganizer && <Badge variant="outline">Organizer</Badge>}
                                <Badge variant="secondary">Member</Badge>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={() => navigate('/mobile-settings')} variant="outline" size="icon">
                                <Settings className="w-5 h-5" />
                            </Button>
                            <Button onClick={handleLogout} variant="destructive" size="icon">
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="tickets" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="tickets" className="gap-2">
                            <Ticket className="w-4 h-4" />
                            My Tickets
                        </TabsTrigger>
                        <TabsTrigger value="saved" className="gap-2">
                            <Heart className="w-4 h-4" />
                            Saved Events
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tickets" className="space-y-4 animate-in fade-in-50">
                        {loadingTickets ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
                        ) : myTickets.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No tickets found on this email.</p>
                                <Button onClick={() => navigate('/public-events')} variant="link">Browse Events</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {myTickets.map(ticket => (
                                    <TicketCard key={ticket.id} ticket={ticket} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="saved" className="space-y-4 animate-in fade-in-50">
                        {loadingSaved ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
                        ) : savedEvents.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No saved events.</p>
                                <Button onClick={() => navigate('/public-events')} variant="link">Browse Events</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {savedEvents.map(event => (
                                    <Card key={event.id} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/e/${event.id}`)}>
                                        <div className="flex h-32">
                                            <div className="w-1/3 relative">
                                                {event.image_url ? (
                                                    <img src={event.image_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full bg-secondary flex items-center justify-center"><Calendar className="w-8 h-8 opacity-20" /></div>
                                                )}
                                            </div>
                                            <div className="w-2/3 p-4 flex flex-col justify-center">
                                                <h3 className="font-bold line-clamp-1">{event.title}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{event.venue}</p>
                                                <div className="mt-2 flex gap-2">
                                                    <Badge variant="outline" className="text-xs">{new Date(event.event_date).toLocaleDateString()}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

            </div>
        </div>
    );
};

export default UserProfile;
