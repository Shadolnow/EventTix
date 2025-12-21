import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'https://esm.sh/razorpay@2.9.2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Initialize Razorpay
        const razorpay = new Razorpay({
            key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
            key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
        });

        // Get user from JWT
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid authentication' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { amount, currency = 'INR', eventId, ticketId } = await req.json();

        if (!amount || !eventId || !ticketId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: amount, eventId, ticketId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (amount <= 0 || amount > 100000) { // Max ₹1,00,000
            return new Response(
                JSON.stringify({ error: 'Invalid amount. Must be between ₹1 and ₹1,00,000' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify the ticket exists
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('id, event_id, attendee_email, is_validated')
            .eq('id', ticketId)
            .eq('event_id', eventId)
            .single();

        if (ticketError || !ticket) {
            console.error('Ticket lookup error:', ticketError);
            return new Response(
                JSON.stringify({ error: 'Ticket not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Generate unique receipt
        const receipt = `rcpt_${ticketId.substring(0, 8)}_${Date.now()}`;

        // Create Razorpay order
        const orderOptions = {
            amount: Math.round(amount * 100), // Convert to paise and ensure integer
            currency,
            receipt,
            notes: {
                ticket_id: ticketId,
                event_id: eventId,
                user_id: user.id,
                attendee_email: ticket.attendee_email,
            },
        };

        console.log('Creating Razorpay order:', orderOptions);
        const order = await razorpay.orders.create(orderOptions);
        console.log('Razorpay order created:', order.id);

        const orderAmount = typeof order.amount === 'number' ? order.amount : Number(order.amount);

        const responseData = {
            orderId: order.id,
            amount: orderAmount / 100,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
            key: Deno.env.get('RAZORPAY_KEY_ID'),
        };

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('create-payment-order error:', error);

        // Handle specific Razorpay errors
        if (error.code) {
            return new Response(JSON.stringify({
                error: 'Payment service error',
                details: error.description || error.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
})
