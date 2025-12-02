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

    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ error: 'Invalid OTP format' });
    }

    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );

        // Get the most recent OTP for this email
        const { data: otpRecord, error: fetchError } = await supabase
            .from('otp_verifications')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('verified', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRecord) {
            return res.status(400).json({ error: 'No valid OTP found for this email' });
        }

        // Check if OTP has expired
        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);

        if (now > expiresAt) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Verify OTP
        if (otpRecord.otp_code !== otp) {
            return res.status(400).json({ error: 'Invalid OTP code' });
        }

        // Mark OTP as verified
        const { error: updateError } = await supabase
            .from('otp_verifications')
            .update({ verified: true })
            .eq('id', otpRecord.id);

        if (updateError) throw updateError;

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            email: otpRecord.email
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
    }
}
