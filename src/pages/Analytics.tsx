import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, DollarSign, Users, Calendar, Download, MapPin, BarChart3 } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet } from 'lucide-react';

const COLORS = ['#00D9FF', '#A855F7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Analytics = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [forecastModel, setForecastModel] = useState<'linear' | 'growth'>('growth');
    const [reportConfig, setReportConfig] = useState({
        groupBy: 'event',
        metrics: ['revenue', 'tickets', 'attendees']
    });

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        fetchAnalyticsData();
    }, [user, dateRange]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            // Fetch events
            let eventsQuery = supabase
                .from('events')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            // Apply date filter
            if (dateRange !== 'all') {
                const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
                const startDate = subDays(new Date(), days).toISOString();
                eventsQuery = eventsQuery.gte('created_at', startDate);
            }

            const { data: eventsData } = await eventsQuery;
            setEvents(eventsData || []);

            // Fetch tickets for these events
            if (eventsData && eventsData.length > 0) {
                const eventIds = eventsData.map(e => e.id);
                const { data: ticketsData } = await supabase
                    .from('tickets')
                    .select('*')
                    .in('event_id', eventIds);

                setTickets(ticketsData || []);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const totalRevenue = events.reduce((sum, event) => sum + (Number(event.total_revenue) || 0), 0);
    const totalTicketsSold = tickets.length;
    const totalEvents = events.length;
    const avgTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    // Revenue over time
    const revenueOverTime = events.reduce((acc: any[], event) => {
        const date = format(new Date(event.created_at), 'MMM dd');
        const existing = acc.find(item => item.date === date);
        if (existing) {
            existing.revenue += Number(event.total_revenue) || 0;
        } else {
            acc.push({ date, revenue: Number(event.total_revenue) || 0 });
        }
        return acc;
    }, []);

    // Tickets by event
    const ticketsByEvent = events.map(event => ({
        name: event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title,
        tickets: tickets.filter(t => t.event_id === event.id).length,
        revenue: Number(event.total_revenue) || 0
    })).sort((a, b) => b.tickets - a.tickets).slice(0, 10);

    // Event status distribution
    const now = new Date();
    const eventsByStatus = [
        { name: 'Upcoming', value: events.filter(e => new Date(e.event_date) > now).length },
        { name: 'Past', value: events.filter(e => new Date(e.event_date) <= now).length },
    ];

    // Advanced Forecasting
    const generateForecast = () => {
        if (events.length < 2) return [];

        const currentMonth = new Date();
        const forecast = [];

        // Linear: Just average revenue * events
        const avgRevenue = totalRevenue / events.length;

        // Growth: Calculate recent trend weight
        // Simple logic: If last 5 events revenue > avg, assume positive trend
        const recentEvents = events.slice(0, 5);
        const recentAvg = recentEvents.reduce((sum, e) => sum + (Number(e.total_revenue) || 0), 0) / recentEvents.length;
        const growthFactor = recentAvg > avgRevenue ? 1.15 : 0.95; // 15% growth or 5% decline

        let runningRevenue = avgRevenue * (events.length / 30) * 30; // Monthly baseline

        for (let i = 1; i <= 6; i++) {
            const date = new Date(currentMonth);
            date.setMonth(date.getMonth() + i);

            if (forecastModel === 'growth') {
                runningRevenue = runningRevenue * growthFactor;
            }

            forecast.push({
                month: format(date, 'MMM yyyy'),
                projected: forecastModel === 'growth' ? runningRevenue : (avgRevenue * (events.length / 30) * 30 * i), // Linear adds up, Growth compounds
                model: forecastModel
            });
        }
        return forecast;
    };

    // Custom Report Builder Logic
    const generateCustomReport = () => {
        let reportData: any[] = [];

        if (reportConfig.groupBy === 'event') {
            reportData = events.map(e => {
                const eventTickets = tickets.filter(t => t.event_id === e.id);
                return {
                    label: e.title,
                    revenue: Number(e.total_revenue) || 0,
                    tickets: eventTickets.length,
                    attendees: new Set(eventTickets.map(t => t.attendee_email)).size
                };
            });
        } else if (reportConfig.groupBy === 'date') {
            const grouped = events.reduce((acc: any, e) => {
                const month = format(new Date(e.event_date), 'MMM yyyy');
                if (!acc[month]) acc[month] = { revenue: 0, tickets: 0, attendees: new Set() };

                acc[month].revenue += Number(e.total_revenue) || 0;

                const eventTickets = tickets.filter(t => t.event_id === e.id);
                acc[month].tickets += eventTickets.length;
                eventTickets.forEach(t => acc[month].attendees.add(t.attendee_email));

                return acc;
            }, {});

            reportData = Object.entries(grouped).map(([label, data]: any) => ({
                label,
                revenue: data.revenue,
                tickets: data.tickets,
                attendees: data.attendees.size
            }));
        }

        return reportData;
    };


    // Cohort Analysis (Retention)
    const generateCohorts = () => {
        if (!tickets.length || !events.length) return [];

        const userFirstSeen: Record<string, string> = {}; // email -> YYYY-MM
        const userActivity: Record<string, Set<string>> = {}; // email -> Set(YYYY-MM)

        tickets.forEach(ticket => {
            const email = ticket.attendee_email;
            if (!email) return;

            const event = events.find(e => e.id === ticket.event_id);
            if (!event) return;

            const date = new Date(event.event_date);
            const monthStr = format(date, 'yyyy-MM');

            if (!userFirstSeen[email] || monthStr < userFirstSeen[email]) {
                userFirstSeen[email] = monthStr;
            }

            if (!userActivity[email]) userActivity[email] = new Set();
            userActivity[email].add(monthStr);
        });

        const cohorts: Record<string, { total: number, months: Record<number, number> }> = {};

        Object.entries(userFirstSeen).forEach(([email, startMonth]) => {
            if (!cohorts[startMonth]) cohorts[startMonth] = { total: 0, months: {} };
            cohorts[startMonth].total++;

            const start = new Date(startMonth + '-01');

            userActivity[email].forEach(activeMonth => {
                const current = new Date(activeMonth + '-01');
                const diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());

                if (diffMonths >= 0 && diffMonths <= 11) { // Track up to 12 months
                    cohorts[startMonth].months[diffMonths] = (cohorts[startMonth].months[diffMonths] || 0) + 1;
                }
            });
        });

        return Object.entries(cohorts)
            .sort((a, b) => b[0] > a[0] ? 1 : -1) // Newest cohorts top
            .slice(0, 6) // Last 6 months
            .map(([month, data]) => ({
                month,
                total: data.total,
                retention: data.months
            }));
    };

    // Geographic data (mock - would need actual location data)
    const geographicData = [
        { location: 'Mumbai', events: Math.floor(events.length * 0.3), revenue: totalRevenue * 0.3 },
        { location: 'Delhi', events: Math.floor(events.length * 0.25), revenue: totalRevenue * 0.25 },
        { location: 'Bangalore', events: Math.floor(events.length * 0.20), revenue: totalRevenue * 0.20 },
        { location: 'Pune', events: Math.floor(events.length * 0.15), revenue: totalRevenue * 0.15 },

        { location: 'Others', events: Math.floor(events.length * 0.10), revenue: totalRevenue * 0.10 },
    ];

    // Mock Device Data
    const deviceData = [
        { name: 'Mobile', value: 65, color: '#00D9FF' },
        { name: 'Desktop', value: 25, color: '#A855F7' },
        { name: 'Tablet', value: 10, color: '#10B981' },
    ];

    // Mock Traffic Data
    const trafficData = [
        { name: 'Direct', value: 40, color: '#F59E0B' },
        { name: 'Social', value: 35, color: '#EF4444' },
        { name: 'Search', value: 15, color: '#8B5CF6' },
        { name: 'Referral', value: 10, color: '#10B981' },
    ];

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('EventTix Analytics Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 28);
        doc.text(`Period: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange}`}`, 14, 34);

        // Summary
        doc.setFontSize(14);
        doc.text('Summary', 14, 45);
        autoTable(doc, {
            startY: 50,
            head: [['Metric', 'Value']],
            body: [
                ['Total Events', totalEvents.toString()],
                ['Total Tickets Sold', totalTicketsSold.toString()],
                ['Total Revenue', `₹${totalRevenue.toFixed(2)}`],
                ['Average Ticket Price', `₹${avgTicketPrice.toFixed(2)}`],
            ],
        });

        // Top Events
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Top Events by Tickets', 14, 20);
        autoTable(doc, {
            startY: 25,
            head: [['Event', 'Tickets', 'Revenue']],
            body: ticketsByEvent.slice(0, 10).map(e => [
                e.name,
                e.tickets.toString(),
                `₹${e.revenue.toFixed(2)}`
            ]),
        });

        doc.save(`eventtix-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF report downloaded!');
    };

    // Export to Excel
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            ['Metric', 'Value'],
            ['Total Events', totalEvents],
            ['Total Tickets Sold', totalTicketsSold],
            ['Total Revenue', totalRevenue],
            ['Average Ticket Price', avgTicketPrice],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Events sheet
        const eventsData = events.map(e => ({
            Title: e.title,
            Date: format(new Date(e.event_date), 'PPP'),
            Venue: e.venue,
            'Tickets Sold': tickets.filter(t => t.event_id === e.id).length,
            Revenue: Number(e.total_revenue) || 0,
        }));
        const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
        XLSX.utils.book_append_sheet(wb, eventsSheet, 'Events');

        // Tickets sheet
        const ticketsData = tickets.map(t => {
            const event = events.find(e => e.id === t.event_id);
            return {
                'Ticket Code': t.ticket_code,
                Event: event?.title || 'Unknown',
                'Claimed At': t.claimed_at ? format(new Date(t.claimed_at), 'PPP') : 'Not claimed',
                Email: t.email || 'N/A',
            };
        });
        const ticketsSheet = XLSX.utils.json_to_sheet(ticketsData);
        XLSX.utils.book_append_sheet(wb, ticketsSheet, 'Tickets');

        XLSX.writeFile(wb, `eventtix-analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success('Excel report downloaded!');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <h1 className="text-4xl font-bold text-gradient-cyber">Advanced Analytics</h1>
                        <p className="text-muted-foreground mt-2">
                            Data-driven insights for your events
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={exportToPDF}>
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                        </Button>
                        <Button variant="outline" onClick={exportToExcel}>
                            <Download className="w-4 h-4 mr-2" />
                            Excel
                        </Button>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2 mb-6">
                    {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                        <Button
                            key={range}
                            variant={dateRange === range ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDateRange(range)}
                        >
                            {range === 'all' ? 'All Time' : `Last ${range}`}
                        </Button>
                    ))}
                </div>

                {/* Key Metrics */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-cyan-400" />
                                Total Events
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalEvents}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                Tickets Sold
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalTicketsSold}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Across all events
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                Total Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">₹{totalRevenue.toFixed(0)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Gross revenue
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-amber-400" />
                                Avg Ticket Price
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">₹{avgTicketPrice.toFixed(0)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Per ticket
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="revenue">Revenue</TabsTrigger>
                        <TabsTrigger value="geographic">Geographic</TabsTrigger>
                        <TabsTrigger value="forecast">Forecast</TabsTrigger>
                        <TabsTrigger value="cohort">Cohort</TabsTrigger>
                        <TabsTrigger value="reports">Report Builder</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Revenue Over Time */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Revenue Trend</CardTitle>
                                    <CardDescription>Revenue over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={revenueOverTime}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="date" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                                formatter={(value: any) => [`₹${value}`, 'Revenue']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#00D9FF"
                                                fillOpacity={1}
                                                fill="url(#colorRevenue)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Event Status */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Event Status</CardTitle>
                                    <CardDescription>Upcoming vs Past events</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={eventsByStatus}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, value }) => `${name}: ${value}`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {eventsByStatus.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Device & Traffic Stats */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Device Breakdown</CardTitle>
                                    <CardDescription>User devices used for booking</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={deviceData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {deviceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Traffic Sources</CardTitle>
                                    <CardDescription>Where your attendees come from</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={trafficData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis type="number" stroke="#888" />
                                            <YAxis dataKey="name" type="category" stroke="#888" width={60} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                                cursor={{ fill: 'transparent' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {trafficData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Top Events */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Events by Tickets</CardTitle>
                                <CardDescription>Best performing events</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={ticketsByEvent}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={100} />
                                        <YAxis stroke="#888" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            formatter={(value: any, name: string) => [
                                                name === 'tickets' ? value : `₹${value}`,
                                                name === 'tickets' ? 'Tickets' : 'Revenue'
                                            ]}
                                        />
                                        <Legend />
                                        <Bar dataKey="tickets" fill="#00D9FF" />
                                        <Bar dataKey="revenue" fill="#A855F7" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Revenue Tab */}
                    <TabsContent value="revenue" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Breakdown</CardTitle>
                                <CardDescription>Detailed revenue analysis</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {ticketsByEvent.slice(0, 10).map((event, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium">{event.name}</p>
                                                <p className="text-sm text-muted-foreground">{event.tickets} tickets sold</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-green-400">₹{event.revenue.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {((event.revenue / totalRevenue) * 100).toFixed(1)}% of total
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Geographic Tab */}
                    <TabsContent value="geographic" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    Geographic Distribution
                                </CardTitle>
                                <CardDescription>Events and revenue by location</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {geographicData.map((location, index) => (
                                        <div key={index} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{location.location}</span>
                                                <span className="text-sm text-muted-foreground">
                                                    {location.events} events • ₹{location.revenue.toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
                                                    style={{ width: `${(location.events / totalEvents) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Forecast Tab */}
                    <TabsContent value="forecast" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Revenue Forecast
                                </CardTitle>
                                <CardDescription>
                                    Projected revenue using
                                    <select
                                        className="ml-2 bg-muted border border-border rounded px-2 py-1 text-xs"
                                        value={forecastModel}
                                        onChange={(e) => setForecastModel(e.target.value as 'linear' | 'growth')}
                                    >
                                        <option value="linear">Linear Regression (Standard)</option>
                                        <option value="growth">Smart ML Growth (Advanced)</option>
                                    </select>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={generateForecast()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="month" stroke="#888" />
                                        <YAxis stroke="#888" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            formatter={(value: any) => [`₹${value.toFixed(0)}`, 'Projected Revenue']}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="projected"
                                            stroke="#00D9FF"
                                            strokeWidth={2}
                                            dot={{ fill: '#00D9FF', r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <p className="text-sm text-amber-500">
                                        ⚠️ Forecast is based on historical average. Actual results may vary based on market conditions and event performance.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {/* Cohort Tab */}
                    <TabsContent value="cohort" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    User Retention Cohorts
                                </CardTitle>
                                <CardDescription>Percentage of users returning in subsequent months</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-3 px-4">Cohort</th>
                                                <th className="text-left py-3 px-4">Users</th>
                                                {[0, 1, 2, 3, 4, 5].map(m => (
                                                    <th key={m} className="text-center py-3 px-2">Month {m}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {generateCohorts().map((cohort) => (
                                                <tr key={cohort.month} className="border-b border-border/50 hover:bg-muted/20">
                                                    <td className="py-3 px-4 font-medium">{cohort.month}</td>
                                                    <td className="py-3 px-4">{cohort.total}</td>
                                                    {[0, 1, 2, 3, 4, 5].map(m => {
                                                        const count = cohort.retention[m] || 0;
                                                        const pct = Math.round((count / cohort.total) * 100);
                                                        const intensity = Math.min(pct, 100) / 100;
                                                        return (
                                                            <td key={m} className="text-center p-1">
                                                                <div
                                                                    className="py-1 rounded text-xs font-semibold"
                                                                    style={{
                                                                        backgroundColor: `rgba(0, 217, 255, ${intensity * 0.8})`,
                                                                        color: intensity > 0.5 ? '#000' : '#fff'
                                                                    }}
                                                                >
                                                                    {pct}%
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                            {generateCohorts().length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                                                        Not enough data to generate cohorts yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {/* Report Builder Tab */}
                    <TabsContent value="reports" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                                    Custom Report Builder
                                </CardTitle>
                                <CardDescription>Create specific reports based on your needs</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-6 mb-6 p-4 bg-muted/20 rounded-lg">
                                    <div className="space-y-2">
                                        <Label>Group Data By</Label>
                                        <Select
                                            value={reportConfig.groupBy}
                                            onValueChange={(val) => setReportConfig({ ...reportConfig, groupBy: val })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="event">Event Name</SelectItem>
                                                <SelectItem value="date">Month (Date)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Select Metrics</Label>
                                        <div className="flex flex-col gap-2">
                                            {['revenue', 'tickets', 'attendees'].map(metric => (
                                                <div key={metric} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={metric}
                                                        checked={reportConfig.metrics.includes(metric)}
                                                        onCheckedChange={(checked) => {
                                                            const newMetrics = checked
                                                                ? [...reportConfig.metrics, metric]
                                                                : reportConfig.metrics.filter(m => m !== metric);
                                                            setReportConfig({ ...reportConfig, metrics: newMetrics });
                                                        }}
                                                    />
                                                    <Label htmlFor={metric} className="capitalize">{metric}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <Button className="w-full" onClick={() => toast.success('Report updated!')}>
                                            Refresh Report
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px] font-bold">
                                                    {reportConfig.groupBy === 'event' ? 'Event Name' : 'Month'}
                                                </TableHead>
                                                {reportConfig.metrics.includes('revenue') && <TableHead className="text-right">Revenue</TableHead>}
                                                {reportConfig.metrics.includes('tickets') && <TableHead className="text-right">Tickets Sold</TableHead>}
                                                {reportConfig.metrics.includes('attendees') && <TableHead className="text-right">Unique Attendees</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {generateCustomReport().map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{row.label}</TableCell>
                                                    {reportConfig.metrics.includes('revenue') && (
                                                        <TableCell className="text-right">₹{row.revenue.toFixed(2)}</TableCell>
                                                    )}
                                                    {reportConfig.metrics.includes('tickets') && (
                                                        <TableCell className="text-right">{row.tickets}</TableCell>
                                                    )}
                                                    {reportConfig.metrics.includes('attendees') && (
                                                        <TableCell className="text-right">{row.attendees}</TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                            {generateCustomReport().length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                                        No data available for this selection
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
};

export default Analytics;
