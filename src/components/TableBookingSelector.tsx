import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, MapPin, IndianRupee, Check, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Table {
    id: string;
    table_name: string;
    table_number: number;
    capacity: number;
    price: number;
    location?: string;
    features?: string[];
    is_available: boolean;
}

interface TableBookingSelectorProps {
    eventId: string;
}

export const TableBookingSelector = ({ eventId }: TableBookingSelectorProps) => {
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [showBookingDialog, setShowBookingDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    const [bookingData, setBookingData] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        number_of_guests: 2,
        special_requests: '',
    });

    useEffect(() => {
        fetchTables();
    }, [eventId]);

    const fetchTables = async () => {
        const { data, error } = await supabase
            .from('event_tables')
            .select('*')
            .eq('event_id', eventId)
            .order('sort_order');

        if (data && !error) {
            setTables(data);
        }
    };

    const handleTableSelect = (table: Table) => {
        if (!table.is_available) {
            toast.error('This table is already booked');
            return;
        }
        setSelectedTable(table);
        setBookingData({ ...bookingData, number_of_guests: table.capacity });
        setShowBookingDialog(true);
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTable) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('table_bookings')
                .insert([{
                    table_id: selectedTable.id,
                    event_id: eventId,
                    customer_name: bookingData.customer_name,
                    customer_email: bookingData.customer_email,
                    customer_phone: bookingData.customer_phone,
                    number_of_guests: bookingData.number_of_guests,
                    total_price: selectedTable.price,
                    special_requests: bookingData.special_requests,
                    payment_status: 'pending',
                    status: 'confirmed',
                }])
                .select()
                .single();

            if (error) throw error;

            // Celebration!
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00E5FF', '#B400FF', '#FFFFFF']
            });

            toast.success(`🎉 Table ${selectedTable.table_name} booked successfully!`, {
                description: `Booking Code: ${data.booking_code}`,
                duration: 8000,
            });

            setShowBookingDialog(false);
            setSelectedTable(null);
            setBookingData({
                customer_name: '',
                customer_email: '',
                customer_phone: '',
                number_of_guests: 2,
                special_requests: '',
            });
            fetchTables(); // Refresh to show updated availability
        } catch (error: any) {
            console.error('Booking error:', error);
            toast.error('Failed to book table');
        } finally {
            setLoading(false);
        }
    };

    const availableCount = tables.filter(t => t.is_available).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Table Booking
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {availableCount} of {tables.length} tables available
                    </p>
                </div>
                <Badge variant={availableCount > 0 ? 'success' : 'destructive'} className="text-sm">
                    {availableCount > 0 ? `${availableCount} Available` : 'Fully Booked'}
                </Badge>
            </div>

            {tables.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No tables available for this event</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tables.map((table) => (
                        <Card
                            key={table.id}
                            className={`cursor-pointer transition-all hover:shadow-lg ${!table.is_available ? 'opacity-60' : 'hover:border-primary'
                                }`}
                            onClick={() => handleTableSelect(table)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{table.table_name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Table #{table.table_number}
                                        </p>
                                    </div>
                                    <Badge variant={table.is_available ? 'success' : 'destructive'}>
                                        {table.is_available ? (
                                            <><Check className="w-3 h-3 mr-1" /> Available</>
                                        ) : (
                                            <><X className="w-3 h-3 mr-1" /> Booked</>
                                        )}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span>{table.capacity} Seats</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <IndianRupee className="w-5 h-5 text-primary" />
                                    <span className="text-2xl font-bold">₹{table.price.toLocaleString()}</span>
                                </div>

                                {table.location && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">{table.location}</span>
                                    </div>
                                )}

                                {table.features && table.features.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {table.features.map((feature, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                {feature}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <Button
                                    className="w-full"
                                    disabled={!table.is_available}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTableSelect(table);
                                    }}
                                >
                                    {table.is_available ? 'Book Table' : 'Already Booked'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Booking Dialog */}
            <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Book {selectedTable?.table_name}</DialogTitle>
                    </DialogHeader>

                    {selectedTable && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Capacity</span>
                                    <span className="font-semibold">{selectedTable.capacity} Seats</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Price</span>
                                    <span className="font-semibold text-primary">₹{selectedTable.price.toLocaleString()}</span>
                                </div>
                                {selectedTable.location && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Location</span>
                                        <span className="font-semibold">{selectedTable.location}</span>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleBooking} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Your Name *</Label>
                                    <Input
                                        id="name"
                                        value={bookingData.customer_name}
                                        onChange={(e) => setBookingData({ ...bookingData, customer_name: e.target.value })}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={bookingData.customer_email}
                                        onChange={(e) => setBookingData({ ...bookingData, customer_email: e.target.value })}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={bookingData.customer_phone}
                                        onChange={(e) => setBookingData({ ...bookingData, customer_phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guests">Number of Guests *</Label>
                                    <Input
                                        id="guests"
                                        type="number"
                                        value={bookingData.number_of_guests}
                                        onChange={(e) => setBookingData({ ...bookingData, number_of_guests: parseInt(e.target.value) })}
                                        min="1"
                                        max={selectedTable.capacity}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Max {selectedTable.capacity} guests for this table
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="requests">Special Requests (Optional)</Label>
                                    <Textarea
                                        id="requests"
                                        value={bookingData.special_requests}
                                        onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
                                        placeholder="Any special requirements..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowBookingDialog(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={loading}>
                                        {loading ? 'Booking...' : `Book for ₹${selectedTable.price.toLocaleString()}`}
                                    </Button>
                                </div>
                            </form>

                            <p className="text-xs text-muted-foreground text-center">
                                You'll receive a booking confirmation via email
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
