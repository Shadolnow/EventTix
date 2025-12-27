import { Resend } from 'resend';

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

    const {
        adminEmail,
        customerName,
        customerEmail,
        eventTitle,
        ticketType,
        quantity,
        totalAmount,
        paymentMethod
    } = req.body;

    if (!adminEmail || !customerName || !eventTitle) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            console.error('RESEND_API_KEY is not set');
            return res.status(500).json({ error: 'Email service not configured' });
        }

        const resend = new Resend(resendApiKey);

        // Create email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 32px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .party-icons {
            font-size: 40px;
            margin: 15px 0;
        }
        .content {
            padding: 40px 30px;
        }
        .alert-box {
            background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
            border-left: 5px solid #e17055;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }
        .info-label {
            font-weight: bold;
            color: #555;
        }
        .info-value {
            color: #222;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="party-icons">🎊 🎉 🎊</div>
            <h1>🎫 New Ticket Booked!</h1>
            <p style="color: white; margin: 10px 0 0 0;">You have a new customer!</p>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <strong>🔔 Ticket Alert!</strong><br>
                A customer just booked tickets for your event.
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                Event Details
            </h2>
            
            <div class="info-row">
                <span class="info-label">📅 Event:</span>
                <span class="info-value">${eventTitle}</span>
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 30px;">
                Customer Information
            </h2>
            
            <div class="info-row">
                <span class="info-label">👤 Name:</span>
                <span class="info-value">${customerName}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">📧 Email:</span>
                <span class="info-value">${customerEmail || 'Not provided'}</span>
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 30px;">
                Booking Details
            </h2>
            
            <div class="info-row">
                <span class="info-label">🎫 Ticket Type:</span>
                <span class="info-value">${ticketType || 'General Admission'}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">🔢 Quantity:</span>
                <span class="info-value">${quantity || 1} ticket(s)</span>
            </div>
            
            ${totalAmount ? `
            <div class="info-row">
                <span class="info-label">💰 Total Amount:</span>
                <span class="info-value">₹${totalAmount}</span>
            </div>
            ` : ''}
            
            ${paymentMethod ? `
            <div class="info-row">
                <span class="info-label">💳 Payment Method:</span>
                <span class="info-value">${paymentMethod}</span>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.VITE_APP_URL || 'https://eventtix.vercel.app'}/global-tickets" class="cta-button">
                    View All Tickets →
                </a>
            </div>
        </div>

        <div class="footer">
            <p><strong>EventTix</strong> - Your Event Management Platform</p>
            <p style="font-size: 12px; color: #999;">
                This is an automated notification. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
        `;

        // Send email
        const { data, error } = await resend.emails.send({
            from: 'EventTix <onboarding@resend.dev>', // Use Resend test domain or your verified domain
            to: [adminEmail],
            subject: `🎉 New Ticket Booked for ${eventTitle}!`,
            html: emailHtml,
        });

        if (error) {
            console.error('Resend error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({
            success: true,
            message: 'Admin notification sent successfully',
            emailId: data?.id
        });
    } catch (error) {
        console.error('Send admin notification error:', error);
        res.status(500).json({
            error: 'Failed to send notification',
            details: error.message
        });
    }
}
