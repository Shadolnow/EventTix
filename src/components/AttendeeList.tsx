import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface AttendeeListProps {
  tickets: any[];
  eventTitle: string;
  eventId: string;
}

export const AttendeeList = ({ tickets, eventTitle, eventId }: AttendeeListProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const downloadCSV = async () => {
    if (tickets.length === 0) {
      toast.error('No attendees to download');
      return;
    }

    setIsExporting(true);

    try {
      // Call edge function for secure export with audit logging
      const { data: authData } = await supabase.auth.getSession();
      
      if (!authData.session) {
        toast.error('You must be signed in to export data');
        setIsExporting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('export-attendees', {
        body: { eventId, eventTitle },
      });

      if (error) {
        console.error('Export error:', error);
        if (error.message?.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait before exporting again.');
        } else if (error.message?.includes('permission')) {
          toast.error('You do not have permission to export this data');
        } else {
          toast.error('Failed to export attendee list. Please try again.');
        }
        setIsExporting(false);
        return;
      }

      if (!data?.tickets) {
        toast.error('No data received from server');
        setIsExporting(false);
        return;
      }

      // Create CSV content from server response
      const headers = ['Name', 'Email', 'Phone', 'Ticket Code', 'Status', 'Validated At', 'Created At'];
      const rows = data.tickets.map((ticket: any) => [
        ticket.attendee_name,
        ticket.attendee_email,
        ticket.attendee_phone || 'N/A',
        ticket.ticket_code,
        ticket.is_validated ? 'Validated' : 'Pending',
        ticket.validated_at ? format(new Date(ticket.validated_at), 'PPpp') : 'N/A',
        format(new Date(ticket.created_at), 'PPpp')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: string[]) => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${eventTitle.replace(/\s+/g, '_')}_attendees_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Attendee list exported and logged successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to export attendee list');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Attendee List</CardTitle>
            <CardDescription>All registered attendees for this event</CardDescription>
          </div>
          <Button variant="outline" onClick={downloadCSV} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Download CSV'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No attendees yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ticket Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.attendee_name}</TableCell>
                    <TableCell>{ticket.attendee_phone || 'N/A'}</TableCell>
                    <TableCell>{ticket.attendee_email}</TableCell>
                    <TableCell className="font-mono text-xs">{ticket.ticket_code}</TableCell>
                    <TableCell>
                      {ticket.is_validated ? (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="w-4 h-4" />
                          Validated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-500">
                          <Clock className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
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
