import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TicketsTable } from '@/components/TicketsTable';

const AllTicketsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAdminAccess();
    }, [user]);

    const checkAdminAccess = async () => {
        if (!user) {
            navigate('/auth');
            return;
        }

        try {
            const { data: adminCheck } = await supabase.rpc('has_role', {
                _user_id: user.id,
                _role: 'admin',
            });

            if (!adminCheck) {
                toast.error('Access denied. Admin privileges required.');
                navigate('/');
                return;
            }

            setIsAdmin(true);
        } catch (error) {
            console.error('Error checking admin status:', error);
            toast.error('Failed to verify admin access');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-lg">Loading...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link to="/admin">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold">All Tickets</h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <TicketsTable showEventColumn={true} />
            </div>
        </div>
    );
};

export default AllTicketsPage;
