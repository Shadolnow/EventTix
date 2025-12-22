import { format } from 'date-fns';

interface WhatsAppMessageParams {
    phone: string;
    message: string;
}

// Format phone number for WhatsApp
export const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 91
    if (cleaned.startsWith('0')) {
        return '91' + cleaned.slice(1);
    }

    // If doesn't have country code (less than 11 digits), add 91
    if (cleaned.length === 10) {
        return '91' + cleaned;
    }

    return cleaned;
};

// Send WhatsApp message (opens WhatsApp with pre-filled message)
export const sendWhatsAppMessage = ({ phone, message }: WhatsAppMessageParams): void => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
};

// Pre-built message templates
export const WhatsAppTemplates = {
    ticketConfirmation: (params: {
        attendeeName: string;
        eventTitle: string;
        eventDate: Date;
        venue: string;
        ticketCode: string;
        ticketUrl: string;
        isPaid: boolean;
    }) => {
        const { attendeeName, eventTitle, eventDate, venue, ticketCode, ticketUrl, isPaid } = params;

        return `🎫 *Ticket Confirmed!*

Hi ${attendeeName.split(' ')[0]}! 👋

Your ${isPaid ? 'ticket' : 'registration'} for *${eventTitle}* is confirmed!

📅 *Date:* ${format(eventDate, 'EEEE, MMMM d, yyyy')}
📍 *Venue:* ${venue}
🎟️ *Ticket Code:* ${ticketCode}

View your ticket here:
${ticketUrl}

See you there! 🎉`;
    },

    paymentReminder: (params: {
        attendeeName: string;
        eventTitle: string;
        amount: number;
        ticketUrl: string;
        hoursLeft: number;
    }) => {
        const { attendeeName, eventTitle, amount, ticketUrl, hoursLeft } = params;

        return `⏰ *Payment Reminder*

Hi ${attendeeName.split(' ')[0]}!

Your booking for *${eventTitle}* is reserved but payment is pending.

💰 *Amount:* ₹${amount}
⏳ *Time Left:* ${hoursLeft} hours

Complete payment now:
${ticketUrl}

Hurry! Tickets are selling fast! 🔥`;
    },

    eventReminder: (params: {
        attendeeName: string;
        eventTitle: string;
        eventDate: Date;
        venue: string;
        ticketCode: string;
        hoursUntilEvent: number;
    }) => {
        const { attendeeName, eventTitle, eventDate, venue, ticketCode, hoursUntilEvent } = params;

        const timeText = hoursUntilEvent <= 24
            ? `in ${hoursUntilEvent} hours`
            : `in ${Math.ceil(hoursUntilEvent / 24)} days`;

        return `🔔 *Event Reminder*

Hi ${attendeeName.split(' ')[0]}!

*${eventTitle}* is happening ${timeText}!

📅 *Date:* ${format(eventDate, 'EEEE, MMMM d, yyyy')}
📍 *Venue:* ${venue}
🎟️ *Your Code:* ${ticketCode}

Don't forget to bring:
✅ This ticket (screenshot works)
✅ Valid ID

See you soon! 🎉`;
    },

    referralShare: (params: {
        referrerName: string;
        eventTitle: string;
        referralCode: string;
        discountAmount: number;
        eventUrl: string;
    }) => {
        const { referrerName, eventTitle, referralCode, discountAmount, eventUrl } = params;

        return `🎁 *Special Invite from ${referrerName}!*

Hey! 👋

I'm going to *${eventTitle}* and thought you'd love it too!

Use my code *${referralCode}* to get *₹${discountAmount} OFF* your ticket! 🎉

Book now: ${eventUrl}?ref=${referralCode}

See you there! 🙌`;
    },

    ticketTransfer: (params: {
        senderName: string;
        eventTitle: string;
        ticketCode: string;
        ticketUrl: string;
    }) => {
        const { senderName, eventTitle, ticketCode, ticketUrl } = params;

        return `🎁 *You've Received a Ticket!*

Hi there! 👋

${senderName} has transferred a ticket for *${eventTitle}* to you!

🎟️ *Ticket Code:* ${ticketCode}

View your ticket:
${ticketUrl}

Show this at the venue for entry. Enjoy! 🎉`;
    }
};

// Quick send functions
export const sendTicketViaWhatsApp = (
    phone: string,
    attendeeName: string,
    eventTitle: string,
    eventDate: Date,
    venue: string,
    ticketCode: string,
    ticketId: string,
    isPaid: boolean = true
) => {
    const ticketUrl = `${window.location.origin}/ticket/${ticketId}`;
    const message = WhatsAppTemplates.ticketConfirmation({
        attendeeName,
        eventTitle,
        eventDate,
        venue,
        ticketCode,
        ticketUrl,
        isPaid
    });

    sendWhatsAppMessage({ phone, message });
};

export const sendPaymentReminder = (
    phone: string,
    attendeeName: string,
    eventTitle: string,
    amount: number,
    ticketId: string,
    hoursLeft: number = 24
) => {
    const ticketUrl = `${window.location.origin}/ticket/${ticketId}`;
    const message = WhatsAppTemplates.paymentReminder({
        attendeeName,
        eventTitle,
        amount,
        ticketUrl,
        hoursLeft
    });

    sendWhatsAppMessage({ phone, message });
};

export const sendEventReminder = (
    phone: string,
    attendeeName: string,
    eventTitle: string,
    eventDate: Date,
    venue: string,
    ticketCode: string,
    hoursUntilEvent: number
) => {
    const message = WhatsAppTemplates.eventReminder({
        attendeeName,
        eventTitle,
        eventDate,
        venue,
        ticketCode,
        hoursUntilEvent
    });

    sendWhatsAppMessage({ phone, message });
};
