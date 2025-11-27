import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  eventId: string;
  eventTitle: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eventId, eventTitle }: ExportRequest = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Export requested by user ${user.id} for event ${eventId}`);

    // Verify user owns the event or is admin
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    // Verify ownership or admin status
    if (event.user_id !== user.id && !isAdmin) {
      console.warn(`Unauthorized export attempt by user ${user.id} for event ${eventId}`);
      return new Response(
        JSON.stringify({ error: 'You do not have permission to export this event data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting: max 5 exports per event per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('data_exports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Rate limit check error:', countError);
    }

    if (count && count >= 5) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 5 exports per event per hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tickets for the event
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('Failed to fetch tickets:', ticketsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch attendee data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the export
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { error: logError } = await supabase
      .from('data_exports')
      .insert({
        user_id: user.id,
        event_id: eventId,
        export_type: 'attendee_csv',
        record_count: tickets?.length || 0,
        ip_address: clientIp,
      });

    if (logError) {
      console.error('Failed to log export:', logError);
      // Continue anyway - don't fail the export due to logging issue
    }

    console.log(`Export completed: ${tickets?.length || 0} records for event ${eventId}`);

    // Return the tickets data
    return new Response(
      JSON.stringify({
        success: true,
        tickets: tickets || [],
        eventTitle: eventTitle,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
