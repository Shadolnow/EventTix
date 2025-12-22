import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Tag, Trash2, Copy, Percent, IndianRupee, Calendar, Users, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

interface PromoCode {
    id: string;
    code: string;
    event_id: string | null;
    discount_percent: number | null;
    discount_amount: number | null;
    max_uses: number | null;
    current_uses: number;
    valid_from: string | null;
    valid_until: string | null;
    min_purchase: number | null;
    is_active: boolean;
    created_at: string;
}

interface Event {
    id: string;
    title: string;
}

export const PromoCodeManager = () => {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        eventId: 'global',
        discountType: 'percent' as 'percent' | 'amount',
        discountValue: '',
        maxUses: '',
        validFrom: '',
        validUntil: '',
        minPurchase: ''
    });

    useEffect(() => {
        fetchPromoCodes();
        fetchEvents();
    }, []);

    const fetchPromoCodes = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPromoCodes(data || []);
        } catch (error) {
            console.error('Error fetching promo codes:', error);
            // If table doesn't exist yet, show empty list
            setPromoCodes([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('id, title')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, code }));
    };

    const handleCreatePromoCode = async () => {
        if (!formData.code || !formData.discountValue) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            const promoData: any = {
                code: formData.code.toUpperCase(),
                event_id: formData.eventId === 'global' ? null : formData.eventId,
                discount_percent: formData.discountType === 'percent' ? parseFloat(formData.discountValue) : null,
                discount_amount: formData.discountType === 'amount' ? parseFloat(formData.discountValue) : null,
                max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
                valid_from: formData.validFrom || null,
                valid_until: formData.validUntil || null,
                min_purchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
                is_active: true,
                current_uses: 0
            };

            const { error } = await (supabase as any)
                .from('promo_codes')
                .insert(promoData);

            if (error) throw error;

            toast.success('Promo code created successfully!');
            setShowCreateDialog(false);
            resetForm();
            fetchPromoCodes();
        } catch (error: any) {
            console.error('Error creating promo code:', error);
            toast.error(error.message || 'Failed to create promo code');
        }
    };

    const togglePromoCode = async (id: string, isActive: boolean) => {
        try {
            const { error } = await (supabase as any)
                .from('promo_codes')
                .update({ is_active: isActive })
                .eq('id', id);

            if (error) throw error;

            setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));
            toast.success(isActive ? 'Promo code activated' : 'Promo code deactivated');
        } catch (error) {
            toast.error('Failed to update promo code');
        }
    };

    const deletePromoCode = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promo code?')) return;

        try {
            const { error } = await (supabase as any)
                .from('promo_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setPromoCodes(prev => prev.filter(p => p.id !== id));
            toast.success('Promo code deleted');
        } catch (error) {
            toast.error('Failed to delete promo code');
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard');
    };

    const resetForm = () => {
        setFormData({
            code: '',
            eventId: 'global',
            discountType: 'percent',
            discountValue: '',
            maxUses: '',
            validFrom: '',
            validUntil: '',
            minPurchase: ''
        });
    };

    const getEventTitle = (eventId: string | null) => {
        if (!eventId) return 'All Events';
        const event = events.find(e => e.id === eventId);
        return event?.title || 'Unknown Event';
    };

    return (
        <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        Promo Codes
                    </CardTitle>
                    <CardDescription>
                        Manage discount codes for your events
                    </CardDescription>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Code
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create Promo Code</DialogTitle>
                            <DialogDescription>
                                Create a new discount code for your customers
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            {/* Code */}
                            <div className="space-y-2">
                                <Label>Promo Code *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="SUMMER20"
                                        value={formData.code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        className="uppercase"
                                    />
                                    <Button variant="outline" onClick={generateCode} type="button">
                                        Generate
                                    </Button>
                                </div>
                            </div>

                            {/* Event Selection */}
                            <div className="space-y-2">
                                <Label>Apply to Event</Label>
                                <Select
                                    value={formData.eventId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, eventId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">All Events (Global)</SelectItem>
                                        {events.map(event => (
                                            <SelectItem key={event.id} value={event.id}>
                                                {event.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Discount Type & Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <Select
                                        value={formData.discountType}
                                        onValueChange={(value: 'percent' | 'amount') => setFormData(prev => ({ ...prev, discountType: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percent">Percentage (%)</SelectItem>
                                            <SelectItem value="amount">Fixed Amount (₹)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Discount Value *</Label>
                                    <Input
                                        type="number"
                                        placeholder={formData.discountType === 'percent' ? '20' : '100'}
                                        value={formData.discountValue}
                                        onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Usage Limits */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Max Uses (optional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="Unlimited"
                                        value={formData.maxUses}
                                        onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min Purchase (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="No minimum"
                                        value={formData.minPurchase}
                                        onChange={(e) => setFormData(prev => ({ ...prev, minPurchase: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Validity Period */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valid From</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Valid Until</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <Button onClick={handleCreatePromoCode} className="w-full">
                                Create Promo Code
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : promoCodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No promo codes yet</p>
                        <p className="text-sm">Create your first discount code to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead>Valid Until</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promoCodes.map((promo) => (
                                    <TableRow key={promo.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <code className="font-mono font-bold text-primary">{promo.code}</code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-6 h-6"
                                                    onClick={() => copyCode(promo.code)}
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="gap-1">
                                                {promo.discount_percent ? (
                                                    <><Percent className="w-3 h-3" />{promo.discount_percent}%</>
                                                ) : (
                                                    <><IndianRupee className="w-3 h-3" />₹{promo.discount_amount}</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {getEventTitle(promo.event_id)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Users className="w-3 h-3" />
                                                {promo.current_uses}{promo.max_uses ? `/${promo.max_uses}` : ''}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {promo.valid_until ? format(new Date(promo.valid_until), 'MMM d, yyyy') : 'No expiry'}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={promo.is_active}
                                                onCheckedChange={(checked) => togglePromoCode(promo.id, checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => deletePromoCode(promo.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
