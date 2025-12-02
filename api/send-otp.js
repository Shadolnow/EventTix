import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in Supabase
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );

        const { error: dbError } = await supabase
            .from('otp_verifications')
            .insert({
                email: email.toLowerCase(),
                otp_code: otp,
                expires_at: expiresAt.toISOString(),
                verified: false
            });

        if (dbError) throw dbError;

        // Send OTP via Resend
        const { error: emailError } = await resend.emails.send({
            from: 'EventTix <noreply@yourdomain.com>',
            to: email,
            subject: `Your EventTix verification code: ${otp}`,
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">EventTix</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
              <p style="font-size: 16px; color: #666;">Enter this code to verify your email address and claim your ticket:</p>
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 8px;">${otp}</p>
              </div>
              <p style="font-size: 14px; color: #999; margin-top: 25px;">
                This code will expire in 10 minutes.<br>
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} EventTix. All rights reserved.</p>
            </div>
          </body>
        </html>
      `
        });

        if (emailError) throw emailError;

        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP', details: error.message });
    }
}
