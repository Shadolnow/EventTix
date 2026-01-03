import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';

interface SocialProofBannerProps {
    eventId: string;
    capacity?: number;
    ticketsIssued?: number;
}

export const SocialProofBanner = ({ eventId, capacity, ticketsIssued = 0 }: SocialProofBannerProps) => {
    const [recentSales, setRecentSales] = useState(0);
    const [viewingNow, setViewingNow] = useState(0);

    useEffect(() => {
        fetchRecentSales();
        // Simulate "viewing now" with random number (in production, use real-time presence)
        setViewingNow(Math.floor(Math.random() * 15) + 5);
    }, [eventId]);

    const fetchRecentSales = async () => {
        try {
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

            const { count } = await supabase
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', eventId)
                .gte('created_at', twentyFourHoursAgo.toISOString());

            setRecentSales(count || 0);
        } catch (error) {
            console.error('Error fetching recent sales:', error);
        }
    };

    const spotsLeft = capacity ? Math.max(0, capacity - ticketsIssued) : null;
    const isLowStock = spotsLeft !== null && spotsLeft < 20;
    const isVeryLowStock = spotsLeft !== null && spotsLeft < 10;

    return (
        <div className="space-y-3">
            {/* Recent Sales Banner */}
            {recentSales > 0 && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg animate-pulse-slow">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-semibold text-orange-300">
                        🔥 {recentSales} tickets sold in the last 24 hours!
                    </span>
                </div>
            )}

            {/* Viewing Now */}
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-green-400">
                    <Users className="w-4 h-4 inline mr-1" />
                    {viewingNow} people viewing this event right now
                </span>
            </div>

            {/* Limited Availability Warning */}
            {isLowStock && (
                <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg ${isVeryLowStock
                    ? 'bg-red-500/20 border border-red-500/40 animate-pulse'
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                    }`}>
                    <AlertTriangle className={`w-5 h-5 ${isVeryLowStock ? 'text-red-400' : 'text-yellow-400'}`} />
                    <span className={`text-sm font-bold ${isVeryLowStock ? 'text-red-400' : 'text-yellow-400'}`}>
                        {isVeryLowStock
                            ? `🚨 HURRY! Only ${spotsLeft} spots left!`
                            : `⚡ Limited availability - Only ${spotsLeft} spots remaining`
                        }
                    </span>
                </div>
            )}
        </div>
    );
};

interface CountdownTimerProps {
    deadline: Date;
    label?: string;
}

export const CountdownTimer = ({ deadline, label = "Early Bird Ends In" }: CountdownTimerProps) => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: false
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = deadline.getTime() - new Date().getTime();

            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
                return;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / (1000 * 60)) % 60),
                seconds: Math.floor((difference / 1000) % 60),
                expired: false
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    if (timeLeft.expired) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">{label}</span>
            </div>

            <div className="flex justify-center gap-3">
                <TimeUnit value={timeLeft.days} label="Days" />
                <span className="text-2xl text-purple-400 self-center">:</span>
                <TimeUnit value={timeLeft.hours} label="Hours" />
                <span className="text-2xl text-purple-400 self-center">:</span>
                <TimeUnit value={timeLeft.minutes} label="Mins" />
                <span className="text-2xl text-purple-400 self-center">:</span>
                <TimeUnit value={timeLeft.seconds} label="Secs" />
            </div>
        </div>
    );
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
        <div className="bg-background/50 border border-purple-500/30 rounded-lg w-14 h-14 flex items-center justify-center">
            <span className="text-2xl font-bold text-gradient-cyber font-mono">
                {String(value).padStart(2, '0')}
            </span>
        </div>
        <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
);

interface AvailabilityIndicatorProps {
    available: number;
    total: number;
    tierName?: string;
}

export const AvailabilityIndicator = ({ available, total, tierName }: AvailabilityIndicatorProps) => {
    const percentage = (available / total) * 100;
    const isLow = percentage < 20;
    const isCritical = percentage < 10;

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tierName || 'Tickets'} Available</span>
                <span className={`font-bold ${isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-green-400'}`}>
                    {available} / {total}
                </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                    style={{ width: `${100 - percentage}%` }}
                />
            </div>
            {isCritical && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                    Almost Sold Out!
                </Badge>
            )}
        </div>
    );
};

// === NEW REAL-TIME SOCIAL PROOF COMPONENTS ===

interface LiveViewCounterProps {
    eventId: string;
}

export const LiveViewCounter = ({ eventId }: LiveViewCounterProps) => {
    const [viewCount, setViewCount] = useState(0);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        // Increment view count when component mounts
        const incrementViews = async () => {
            try {
                const { data, error } = await supabase.rpc('increment_event_views', {
                    p_event_id: eventId
                });

                if (!error && data) {
                    setViewCount(data);
                }
            } catch (err) {
                console.error('View tracking error:', err);
            }
        };

        incrementViews();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`event_views_${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'event_views',
                    filter: `event_id=eq.${eventId}`
                },
                (payload) => {
                    if (payload.new && 'viewer_count' in payload.new) {
                        setViewCount((payload.new as any).viewer_count);
                        setIsLive(true);
                        setTimeout(() => setIsLive(false), 2000);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId]);

    if (viewCount === 0) return null;

    return (
        <Badge
            variant="secondary"
            className={`flex items-center gap-2 px-3 py-1.5 transition-all ${isLive ? 'bg-green-500/20 text-green-400 animate-pulse' : ''
                }`}
        >
            <Users className="w-4 h-4" />
            <span className="font-semibold">{viewCount}</span>
            <span className="text-xs opacity-80">viewing now</span>
        </Badge>
    );
};

interface RecentBooking {
    id: string;
    attendee_name: string;
    attendee_location?: string;
    ticket_count: number;
    created_at: string;
}

interface RecentBookingsTickerProps {
    eventId: string;
}

export const RecentBookingsTicker = ({ eventId }: RecentBookingsTickerProps) => {
    const [bookings, setBookings] = useState<RecentBooking[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchBookings = async () => {
            const { data, error } = await supabase
                .from('recent_bookings_feed')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data && !error) {
                setBookings(data);
            }
        };

        fetchBookings();

        const channel = supabase
            .channel(`bookings_${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'recent_bookings_feed',
                    filter: `event_id=eq.${eventId}`
                },
                (payload) => {
                    setBookings(prev => [payload.new as RecentBooking, ...prev].slice(0, 10));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId]);

    useEffect(() => {
        if (bookings.length === 0) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % bookings.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [bookings.length]);

    if (bookings.length === 0) return null;

    const current = bookings[currentIndex];
    const timeAgo = getTimeAgo(current.created_at);

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg animate-in slide-in-from-left">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-sm">
                <span className="font-semibold">{current.attendee_name.split(' ')[0]}</span>
                {current.attendee_location && (
                    <span className="text-muted-foreground"> from {current.attendee_location}</span>
                )}
                <span className="text-muted-foreground"> just booked</span>
                {current.ticket_count > 1 && (
                    <span className="font-semibold text-primary"> {current.ticket_count} tickets</span>
                )}
                <span className="text-xs text-muted-foreground ml-2">• {timeAgo}</span>
            </p>
        </div>
    );
};

interface BookingStatsProps {
    eventId: string;
}

export const BookingStats = ({ eventId }: BookingStatsProps) => {
    const [stats, setStats] = useState({
        last24h: 0,
        lastHour: 0,
        trending: false
    });

    useEffect(() => {
        const fetchStats = async () => {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

            const { data: tickets } = await supabase
                .from('tickets')
                .select('created_at')
                .eq('event_id', eventId)
                .gte('created_at', last24h.toISOString());

            if (tickets) {
                const last24hCount = tickets.length;
                const lastHourCount = tickets.filter(
                    t => new Date(t.created_at) >= lastHour
                ).length;

                setStats({
                    last24h: last24hCount,
                    lastHour: lastHourCount,
                    trending: lastHourCount > 5
                });
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, [eventId]);

    return (
        <div className="flex items-center gap-4">
            {stats.trending && (
                <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
                    <TrendingUp className="w-3 h-3" />
                    <span>Trending</span>
                </Badge>
            )}

            {stats.lastHour > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{stats.lastHour} sold in last hour</span>
                </div>
            )}
        </div>
    );
};

function getTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
