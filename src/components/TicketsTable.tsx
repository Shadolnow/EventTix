import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2,
    Search,
    RefreshCw,
    Check,
    X,
    Clock,
    AlertCircle,
    Download,
    Eye
} from "lucide-react";
import { format } from "date-fns";
import { StatsCards } from "./StatsCards";

interface Ticket {
    id: string;
    ticket_code: string;
    attendee_name: string;
    attendee_email: string;
    attendee_phone: string | null;
    payment_status: string;
    payment_ref_id: string | null;
    is_validated: boolean;
    created_at: string;
    validated_at: string | null;
    tier_name?: string;
    events: {
        title: string;
        ticket_price: number;
    };
    ticket_tiers?: {
        name: string;
        price: number;
    } | null;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    pay_at_venue: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    paid: "bg-green-500/20 text-green-400 border-green-500/50",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/50",
};

const statusIcons: Record<string, typeof Clock> = {
    pending: Clock,
    pay_at_venue: AlertCircle,
    paid: Check,
    cancelled: X,
};

interface TicketsTableProps {
    eventId?: string;
    showEventColumn?: boolean;
}

export function TicketsTable({ eventId, showEventColumn = true }: TicketsTableProps) {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

    useEffect(() => {
        fetchTickets();
    }, [eventId]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from("tickets")
                .select(`
          *,
          events (title, ticket_price),
          ticket_tiers (name, price)
        `)
                .order("created_at", { ascending: false });

            if (eventId) {
                query = query.eq("event_id", eventId);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error("Error fetching tickets:", error);
            toast.error("Failed to load tickets");
        } finally {
            setIsLoading(false);
        }
    };

    const updateTicketStatus = async (ticketId: string, newStatus: string) => {
        setUpdatingTicketId(ticketId);
        try {
            const updateData: { payment_status: string; validated_at?: string; is_validated?: boolean } = {
                payment_status: newStatus,
            };

            if (newStatus === "paid") {
                updateData.is_validated = false; // Paid but not yet validated at venue
            }

            const { error } = await supabase
                .from("tickets")
                .update(updateData)
                .eq("id", ticketId);

            if (error) throw error;

            setTickets((prev) =>
                prev.map((ticket) =>
                    ticket.id === ticketId
                        ? { ...ticket, payment_status: newStatus }
                        : ticket
                )
            );

            toast.success(`Ticket status updated to ${newStatus}`);
        } catch (error) {
            console.error("Error updating ticket:", error);
            toast.error("Failed to update ticket status");
        } finally {
            setUpdatingTicketId(null);
        }
    };

    const filteredTickets = tickets.filter((ticket) => {
        const matchesSearch =
            ticket.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.attendee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.attendee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ticket.attendee_phone?.includes(searchTerm) ?? false) ||
            (ticket.payment_ref_id?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

        const matchesStatus = statusFilter === "all" || ticket.payment_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Calculate stats
    const today = new Date().toDateString();
    const stats = {
        total: tickets.length,
        pending: tickets.filter((t) => t.payment_status === "pending" || t.payment_status === "pay_at_venue").length,
        completed: tickets.filter((t) => t.payment_status === "paid").length,
        validated: tickets.filter((t) => t.is_validated).length,
        todayCount: tickets.filter((t) => new Date(t.created_at).toDateString() === today).length,
        revenue: tickets
            .filter((t) => t.payment_status === "paid")
            .reduce((sum, t) => sum + (t.ticket_tiers?.price || t.events?.ticket_price || 0), 0),
    };

    const exportToCSV = () => {
        const headers = [
            "Ticket Code",
            "Attendee Name",
            "Email",
            "Phone",
            "Event",
            "Tier",
            "Amount",
            "Payment Ref",
            "Status",
            "Validated",
            "Created At",
            "Validated At",
        ];

        const rows = filteredTickets.map((ticket) => [
            ticket.ticket_code,
            ticket.attendee_name,
            ticket.attendee_email,
            ticket.attendee_phone || "",
            ticket.events?.title || "",
            ticket.ticket_tiers?.name || "Standard",
            (ticket.ticket_tiers?.price || ticket.events?.ticket_price || 0).toString(),
            ticket.payment_ref_id || "",
            ticket.payment_status,
            ticket.is_validated ? "Yes" : "No",
            format(new Date(ticket.created_at), "yyyy-MM-dd HH:mm:ss"),
            ticket.validated_at ? format(new Date(ticket.validated_at), "yyyy-MM-dd HH:mm:ss") : "",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row) =>
                row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `tickets-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success(`Exported ${filteredTickets.length} tickets to CSV`);
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <StatsCards stats={stats} type="tickets" />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by code, name, email, phone, or payment ref..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-muted border-border"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-muted border-border">
                        <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pay_at_venue">Pay at Venue</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchTickets} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
                <Button variant="outline" onClick={exportToCSV} disabled={filteredTickets.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {/* Tickets Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No tickets found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border">
                                    <TableHead>Ticket Code</TableHead>
                                    <TableHead>Attendee</TableHead>
                                    {showEventColumn && <TableHead>Event</TableHead>}
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Payment Ref</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTickets.map((ticket) => {
                                    const StatusIcon = statusIcons[ticket.payment_status] || Clock;
                                    return (
                                        <TableRow key={ticket.id} className="border-border">
                                            <TableCell className="font-mono font-bold text-primary">
                                                {ticket.ticket_code}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{ticket.attendee_name}</p>
                                                    <p className="text-xs text-muted-foreground">{ticket.attendee_email}</p>
                                                    {ticket.attendee_phone && (
                                                        <p className="text-xs text-muted-foreground">{ticket.attendee_phone}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {showEventColumn && (
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{ticket.events?.title}</p>
                                                        {ticket.ticket_tiers?.name && (
                                                            <Badge variant="outline" className="text-xs mt-1">
                                                                {ticket.ticket_tiers.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="font-bold">
                                                ₹{(ticket.ticket_tiers?.price || ticket.events?.ticket_price || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {ticket.payment_ref_id || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge
                                                        variant="outline"
                                                        className={statusColors[ticket.payment_status] || ""}
                                                    >
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {ticket.payment_status}
                                                    </Badge>
                                                    {ticket.is_validated && (
                                                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                                                            <Check className="w-3 h-3 mr-1" />
                                                            Validated
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(ticket.created_at), "MMM d, yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={ticket.payment_status}
                                                    onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                                                    disabled={updatingTicketId === ticket.id}
                                                >
                                                    <SelectTrigger className="w-32 h-8 text-xs">
                                                        {updatingTicketId === ticket.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <SelectValue />
                                                        )}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="pay_at_venue">Pay at Venue</SelectItem>
                                                        <SelectItem value="paid">Paid</SelectItem>
                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
