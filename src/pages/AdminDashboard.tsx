import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Users, Calendar, Ticket, TrendingUp, Shield, Mail, ArrowLeft, Loader2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'moderator' | 'user';
}

interface Stats {
  totalUsers: number;
  totalEvents: number;
  totalTickets: number;
  recentSignups: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalEvents: 0, totalTickets: 0, recentSignups: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [sendingUpdate, setSendingUpdate] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check admin status
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
      await loadDashboardData();
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Failed to verify admin access');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load statistics
      const [usersResponse, eventsResponse, ticketsResponse] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
      ]);

      // Get recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentSignupsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      setStats({
        totalUsers: usersResponse.count || 0,
        totalEvents: eventsResponse.count || 0,
        totalTickets: ticketsResponse.count || 0,
        recentSignups: recentSignupsCount || 0,
      });

      // Load events list
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, event_date, tickets_issued')
        .order('event_date', { ascending: false });
      
      if (eventsData) {
        setEvents(eventsData);
      }

      // Load users list
      await loadUsers();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users');

      if (error) throw error;

      if (data?.users) {
        // Load user roles
        const usersWithRoles = await Promise.all(
          data.users.map(async (u: any) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', u.id)
              .single();

            return {
              id: u.id,
              email: u.email,
              created_at: u.created_at,
              role: roleData?.role || 'user',
            };
          })
        );

        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users list');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'moderator' | 'user') => {
    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: newRole }]);

        if (error) throw error;
      }

      toast.success('User role updated successfully');
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role: ' + error.message);
    }
  };

  const handleSendEventUpdate = async () => {
    if (!selectedEvent || !updateMessage.trim()) {
      toast.error('Please select an event and enter a message');
      return;
    }

    setSendingUpdate(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-event-update', {
        body: {
          eventId: selectedEvent,
          updateMessage: updateMessage.trim(),
        },
      });

      if (error) throw error;

      toast.success(`Update sent to ${data.emailsSent} attendees`);
      setUpdateMessage('');
      setSelectedEvent('');
    } catch (error: any) {
      console.error('Error sending event update:', error);
      toast.error('Failed to send event update: ' + error.message);
    } finally {
      setSendingUpdate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            Administrator
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.recentSignups} in last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">Active events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-xs text-muted-foreground">Tickets issued</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">Healthy</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="events">Event Overview</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleRoleChange(u.id, value as 'admin' | 'moderator' | 'user')}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Overview</CardTitle>
                <CardDescription>
                  Monitor all events across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Event management coming soon</p>
                  <p className="text-sm mt-2">
                    View and manage all events from the{' '}
                    <Link to="/admin/events" className="text-primary hover:underline">
                      Events page
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Event Update</CardTitle>
                <CardDescription>
                  Notify all ticket holders about event changes or updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Event</Label>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title} ({event.tickets_issued} tickets)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Update Message</Label>
                  <Textarea
                    placeholder="Enter your update message for attendees..."
                    value={updateMessage}
                    onChange={(e) => setUpdateMessage(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be sent to all ticket holders for the selected event
                  </p>
                </div>

                <Button
                  onClick={handleSendEventUpdate}
                  disabled={sendingUpdate || !selectedEvent || !updateMessage.trim()}
                  className="w-full"
                >
                  {sendingUpdate ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Update to Attendees
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Notification Status</CardTitle>
                <CardDescription>
                  Monitor automated email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Ticket Confirmation Emails</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically sent when users claim tickets
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Event Update Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Sent manually via the interface above
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    Active
                  </Badge>
                </div>

                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Email notifications are powered by Resend. Ticket confirmations are sent 
                    automatically when tickets are claimed from the public event page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
