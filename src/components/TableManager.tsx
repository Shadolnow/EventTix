import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, Users, MapPin, IndianRupee, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

interface Table {
    id: string;
    table_name: string;
    table_number: number;
    capacity: number;
    price: number;
    location?: string;
    features?: string[];
    is_available: boolean;
    sort_order: number;
}

interface TableManagerProps {
    eventId: string;
}

export const TableManager = ({ eventId }: TableManagerProps) => {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [showDialog, setShowDialog] = useState(false);

    const [formData, setFormData] = useState({
        table_name: '',
        table_number: 1,
        capacity: 4,
        price: 0,
        location: '',
        features: '',
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const tableData = {
                event_id: eventId,
                table_name: formData.table_name,
                table_number: formData.table_number,
                capacity: formData.capacity,
                price: formData.price,
                location: formData.location || null,
                features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
                sort_order: tables.length,
            };

            if (editingTable) {
                // Update existing table
                const { error } = await supabase
                    .from('event_tables')
                    .update(tableData)
                    .eq('id', editingTable.id);

                if (error) throw error;
                toast.success('Table updated successfully!');
            } else {
                // Create new table
                const { error } = await supabase
                    .from('event_tables')
                    .insert([tableData]);

                if (error) throw error;
                toast.success('Table added successfully!');
            }

            // Reset form
            setFormData({
                table_name: '',
                table_number: tables.length + 1,
                capacity: 4,
                price: 0,
                location: '',
                features: '',
            });
            setEditingTable(null);
            setShowDialog(false);
            fetchTables();
        } catch (error: any) {
            console.error('Error saving table:', error);
            toast.error('Failed to save table');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (table: Table) => {
        setEditingTable(table);
        setFormData({
            table_name: table.table_name,
            table_number: table.table_number,
            capacity: table.capacity,
            price: table.price,
            location: table.location || '',
            features: table.features?.join(', ') || '',
        });
        setShowDialog(true);
    };

    const handleDelete = async (tableId: string) => {
        if (!confirm('Are you sure you want to delete this table?')) return;

        try {
            const { error } = await supabase
                .from('event_tables')
                .delete()
                .eq('id', tableId);

            if (error) throw error;
            toast.success('Table deleted successfully!');
            fetchTables();
        } catch (error: any) {
            console.error('Error deleting table:', error);
            toast.error('Failed to delete table');
        }
    };

    const openAddDialog = () => {
        setEditingTable(null);
        setFormData({
            table_name: `Table ${tables.length + 1}`,
            table_number: tables.length + 1,
            capacity: 4,
            price: 0,
            location: '',
            features: '',
        });
        setShowDialog(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Table Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Add and manage tables for booking
                    </p>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={openAddDialog}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Table
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTable ? 'Edit Table' : 'Add New Table'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="table_name">Table Name</Label>
                                    <Input
                                        id="table_name"
                                        value={formData.table_name}
                                        onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                                        placeholder="Table 1"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="table_number">Table Number</Label>
                                    <Input
                                        id="table_number"
                                        type="number"
                                        value={formData.table_number}
                                        onChange={(e) => setFormData({ ...formData, table_number: parseInt(e.target.value) })}
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="capacity">Capacity (Seats)</Label>
                                    <Input
                                        id="capacity"
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                        min="1"
                                        max="20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (₹)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location (Optional)</Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g., Near Stage, VIP Section"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="features">Features (Optional)</Label>
                                <Textarea
                                    id="features"
                                    value={formData.features}
                                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                                    placeholder="AC, Window View, Near Bar (comma separated)"
                                    rows={2}
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : editingTable ? 'Update Table' : 'Add Table'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {tables.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No tables added yet</p>
                        <Button onClick={openAddDialog}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Table
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tables.map((table) => (
                        <Card key={table.id} className="relative group">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{table.table_name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Table #{table.table_number}
                                        </p>
                                    </div>
                                    <Badge variant={table.is_available ? 'success' : 'destructive'}>
                                        {table.is_available ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                                        {table.is_available ? 'Available' : 'Booked'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span>{table.capacity} Seats</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-semibold">₹{table.price.toLocaleString()}</span>
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
                                                {feature}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleEdit(table)}
                                    >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => handleDelete(table.id)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                <Users className="w-5 h-5 text-primary" />
                <div className="flex-1">
                    <p className="text-sm font-medium">Total Tables: {tables.length}</p>
                    <p className="text-xs text-muted-foreground">
                        Available: {tables.filter(t => t.is_available).length} |
                        Booked: {tables.filter(t => !t.is_available).length}
                    </p>
                </div>
            </div>
        </div>
    );
};
