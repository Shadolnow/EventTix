import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ClaimBody = {
  eventId: string;
  name: string;
  phone: string;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const body = (await req.json()) as ClaimBody;
    const { eventId, name, phone } = body;

    // Basic input validation
    if (!eventId || !name || !phone) {
      return new Response(
        JSON.stringify({ error: 'missing_fields', message: 'Required fields are missing.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = phone.trim();
    // Generate email from phone for database compatibility
    const generatedEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@inhouse.local`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - 30_000); // 30s cooldown per IP

    // Capacity check via RPC if available
    const { data: availabilityData, error: availabilityError } = await supabase
      .rpc('check_ticket_availability', { event_id_input: eventId });
    if (availabilityError) {
      // Soft-fail to avoid leaking internal details
      console.error('Availability check failed', availabilityError);
    }
    if (availabilityData === false) {
      return new Response(
        JSON.stringify({ error: 'sold_out', message: 'This event is sold out.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting by IP (simple sliding window)
    const { data: recentClaims } = await supabase
      .from('ticket_claim_logs')
      .select('id')
      .eq('ip_address', ip)
      .eq('event_id', eventId)
      .gte('created_at', windowStart.toISOString())
      .limit(1);

    if (recentClaims && recentClaims.length > 0) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Please wait a few seconds before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce one ticket per phone per event
    const { data: existing } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('attendee_phone', normalizedPhone)
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'duplicate_phone', message: 'A ticket for this phone number has already been issued for this event.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate ticket code
    const codePart = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    const ticketCode = `${codePart}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // Insert ticket
    const { data: ticket, error: insertError } = await supabase
      .from('tickets')
      .insert({
        event_id: eventId,
        attendee_name: name.trim(),
        attendee_phone: normalizedPhone,
        attendee_email: generatedEmail,
        ticket_code: ticketCode,
      })
      .select('*, events(*)')
      .single();

    if (insertError || !ticket) {
      console.error('Ticket insert failed', insertError);
      return new Response(
        JSON.stringify({ error: 'insert_failed', message: 'Failed to issue ticket. Please try again later.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log claim
    await supabase.from('ticket_claim_logs').insert({
      event_id: eventId,
      email: generatedEmail,
      ip_address: ip,
    });

    // Send ticket confirmation email
    try {
      const ticketUrl = `${req.headers.get('origin') || 'https://app.example.com'}/ticket/${ticket.id}`;
      const eventDate = new Date(ticket.events.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await supabase.functions.invoke('send-ticket-email', {
        body: {
          to: generatedEmail,
          ticketCode: ticketCode,
          attendeeName: name.trim(),
          eventTitle: ticket.events.title,
          eventDate: eventDate,
          eventVenue: ticket.events.venue,
          ticketUrl: ticketUrl,
        },
      });
      
      console.log('Ticket confirmation email sent to:', generatedEmail);
    } catch (emailError) {
      // Log error but don't fail the ticket creation
      console.error('Failed to send ticket email:', emailError);
    }

    return new Response(
      JSON.stringify({ ticket }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('public-claim-ticket error', e);
    return new Response(
      JSON.stringify({ error: 'server_error', message: 'Unexpected error. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
