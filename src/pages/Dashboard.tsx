import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Shield, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  account_type: string;
  company_name?: string;
  plan_type: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user?.id,
        _role: 'admin',
      });

      if (error) throw error;

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      setUsers(rolesData || []);

      // Fetch profiles for all users
      const userIds = rolesData?.map((r) => r.user_id) || [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const profilesMap: Record<string, Profile> = {};
        profilesData?.forEach((p) => {
          profilesMap[p.user_id] = p;
        });
        setProfiles(profilesMap);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading users',
        description: error.message,
      });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAdmin(true);

    try {
      // Call secure edge function to list users
      const { data: response, error: searchError } = await supabase.functions.invoke('admin-list-users');
      
      if (searchError) throw searchError;

      const targetUser = response?.users?.find((u: any) => u.email === newAdminEmail);

      if (!targetUser) {
        toast({
          variant: 'destructive',
          title: 'User not found',
          description: 'No user with this email exists.',
        });
        return;
      }

      // Add admin role
      const { error } = await supabase.from('user_roles').insert({
        user_id: targetUser.id,
        role: 'admin',
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Already an admin',
            description: 'This user is already an admin.',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Admin added',
        description: `${newAdminEmail} is now an admin.`,
      });

      setNewAdminEmail('');
      await loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveRole = async (roleId: string, userEmail: string) => {
    if (!confirm(`Remove admin privileges from ${userEmail}?`)) return;

    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Role removed',
        description: 'Admin privileges have been revoked.',
      });

      await loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient-cyber flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage users and system access</p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Admin
          </h2>
          <form onSubmit={handleAddAdmin} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <Button type="submit" disabled={addingAdmin} className="self-end">
              {addingAdmin ? 'Adding...' : 'Add Admin'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Current Admins</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userRole) => {
                const profile = profiles[userRole.user_id];
                return (
                  <TableRow key={userRole.id}>
                    <TableCell className="font-mono text-sm">
                      {userRole.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {profile?.account_type || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{profile?.company_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={profile?.plan_type === 'paid' ? 'default' : 'secondary'}>
                        {profile?.plan_type || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/20 text-primary">
                        {userRole.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(userRole.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {userRole.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRole(userRole.id, userRole.user_id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
