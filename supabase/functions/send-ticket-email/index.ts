import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketEmailRequest {
  to: string;
  ticketCode: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  ticketUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, ticketCode, attendeeName, eventTitle, eventDate, eventVenue, ticketUrl }: TicketEmailRequest = await req.json();

    console.log('Sending ticket confirmation email to:', to);

    const emailResponse = await resend.emails.send({
      from: "EventTix <onboarding@resend.dev>",
      to: [to],
      subject: `Your Ticket for ${eventTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .ticket-info {
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .ticket-code {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                text-align: center;
                padding: 20px;
                background: white;
                border-radius: 8px;
                letter-spacing: 4px;
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background: #667eea;
                color: white !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
              }
              .details {
                margin: 20px 0;
              }
              .details p {
                margin: 8px 0;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎫 Your Ticket is Ready!</h1>
            </div>
            <div class="content">
              <p>Hello ${attendeeName},</p>
              <p>Thank you for registering! Your ticket for <strong>${eventTitle}</strong> has been confirmed.</p>
              
              <div class="ticket-info">
                <h2 style="margin-top: 0;">Event Details</h2>
                <div class="details">
                  <p><strong>📅 Date:</strong> ${new Date(eventDate).toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  <p><strong>📍 Venue:</strong> ${eventVenue}</p>
                </div>
              </div>

              <div style="text-align: center;">
                <p><strong>Your Ticket Code:</strong></p>
                <div class="ticket-code">${ticketCode}</div>
                <p style="font-size: 14px; color: #6b7280;">Present this code at the venue for entry</p>
              </div>

              <div style="text-align: center;">
                <a href="${ticketUrl}" class="button">View Your Ticket</a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                  <strong>Important:</strong> Please save this email or screenshot your ticket code. 
                  You'll need it for entry to the event.
                </p>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent by EventTix</p>
              <p>If you didn't register for this event, please ignore this email.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending ticket email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
