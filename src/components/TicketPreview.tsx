import { forwardRef, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Share2, Calendar, MapPin, User, Phone } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface TicketPreviewData {
    ticketCode: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone?: string;
    eventTitle: string;
    eventDate: string;
    venue: string;
    tierName?: string;
    originalPrice?: number;
    finalPrice: number;
    discountPercent?: number;
    paymentStatus: string;
    isValidated?: boolean;
}

interface TicketPreviewProps {
    data: TicketPreviewData;
    showActions?: boolean;
}

export const TicketPreview = forwardRef<HTMLDivElement, TicketPreviewProps>(
    ({ data, showActions = true }, ref) => {
        const internalRef = useRef<HTMLDivElement>(null);
        const ticketRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

        // Generate QR code data with booking details
        const qrData = useMemo(() => {
            return JSON.stringify({
                code: data.ticketCode,
                event: data.eventTitle,
                name: data.attendeeName,
                date: data.eventDate,
                venue: data.venue,
                tier: data.tierName,
                status: data.paymentStatus,
            });
        }, [data]);

        const handleDownload = async () => {
            if (!ticketRef.current) return;

            try {
                const canvas = await html2canvas(ticketRef.current, {
                    backgroundColor: "#0a0a1a",
                    scale: 2,
                });
                const link = document.createElement("a");
                link.download = `Ticket-${data.ticketCode}.png`;
                link.href = canvas.toDataURL();
                link.click();
                toast.success("Ticket downloaded!");
            } catch (error) {
                toast.error("Failed to download ticket");
            }
        };

        const handlePrint = () => {
            window.print();
        };

        const handleShare = async () => {
            if (!ticketRef.current) return;

            try {
                const canvas = await html2canvas(ticketRef.current, {
                    backgroundColor: "#0a0a1a",
                    scale: 2,
                });
                canvas.toBlob(async (blob) => {
                    if (blob && navigator.share) {
                        const file = new File([blob], `Ticket-${data.ticketCode}.png`, { type: "image/png" });
                        await navigator.share({
                            title: `${data.eventTitle} Ticket`,
                            text: `My ticket for ${data.eventTitle}!`,
                            files: [file],
                        });
                    } else {
                        toast.info("Share not supported on this device");
                    }
                });
            } catch (error) {
                toast.error("Failed to share ticket");
            }
        };

        return (
            <div className="space-y-4">
                <div
                    ref={ticketRef}
                    className="w-full max-w-md mx-auto bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2a] to-[#1a0a2a] rounded-2xl overflow-hidden border border-primary/30"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                >
                    {/* Header */}
                    <div className="relative h-20 overflow-hidden bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a1a]" />
                        <div className="absolute bottom-2 left-4 right-4">
                            <h2
                                className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary"
                            >
                                {data.eventTitle}
                            </h2>
                        </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="p-4 space-y-3">
                        {/* Tier Badge */}
                        {data.tierName && (
                            <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/50">
                                <span className="text-primary font-semibold text-sm">
                                    {data.tierName}
                                </span>
                            </div>
                        )}

                        {/* Main Content - Two Column Layout */}
                        <div className="flex gap-4">
                            {/* Left Column - Guest Info */}
                            <div className="flex-1 space-y-2">
                                <div className="border-b border-white/10 pb-1.5">
                                    <span className="text-gray-500 text-xs flex items-center gap-1">
                                        <User className="w-3 h-3" /> Guest Name
                                    </span>
                                    <span className="text-white font-semibold">{data.attendeeName}</span>
                                </div>
                                {data.attendeePhone && (
                                    <div className="border-b border-white/10 pb-1.5">
                                        <span className="text-gray-500 text-xs flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> Phone
                                        </span>
                                        <span className="text-white text-sm">{data.attendeePhone}</span>
                                    </div>
                                )}
                                <div className="border-b border-white/10 pb-1.5">
                                    <span className="text-gray-500 text-xs flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Date & Time
                                    </span>
                                    <span className="text-white text-sm">
                                        {format(new Date(data.eventDate), "PPP p")}
                                    </span>
                                </div>
                                <div className="pb-1.5">
                                    <span className="text-gray-500 text-xs flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Venue
                                    </span>
                                    <span className="text-white text-sm">{data.venue}</span>
                                </div>
                            </div>

                            {/* Right Column - QR Code */}
                            <div className="flex flex-col items-center justify-center">
                                <div className="bg-white p-2 rounded-lg">
                                    <QRCodeSVG
                                        value={data.ticketCode}
                                        size={90}
                                        level="M"
                                        includeMargin={false}
                                        bgColor="#ffffff"
                                        fgColor="#0a0a1a"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-500 mt-1">Scan to verify</span>
                            </div>
                        </div>

                        {/* Price Section */}
                        <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
                            {data.originalPrice && data.originalPrice !== data.finalPrice && (
                                <>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">Original Price</span>
                                        <span className="text-gray-400 line-through">₹{data.originalPrice}</span>
                                    </div>
                                    {data.discountPercent && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-green-400">Discount</span>
                                            <span className="text-green-400">-{data.discountPercent}%</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex justify-between items-center pt-1.5 border-t border-white/10">
                                <span className="text-white font-semibold text-sm">
                                    {data.paymentStatus === 'paid' ? 'Amount Paid' : 'Amount Due'}
                                </span>
                                <span
                                    className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary"
                                >
                                    ₹{data.finalPrice}
                                </span>
                            </div>
                        </div>

                        {/* Status & Ticket ID */}
                        <div className="flex justify-between items-center text-xs">
                            <div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${data.paymentStatus === 'paid'
                                        ? 'bg-green-500/20 text-green-400'
                                        : data.paymentStatus === 'pay_at_venue'
                                            ? 'bg-orange-500/20 text-orange-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {data.paymentStatus === 'paid' ? '✓ PAID' :
                                        data.paymentStatus === 'pay_at_venue' ? '⏳ PAY AT VENUE' :
                                            '⏳ PENDING'}
                                </span>
                                {data.isValidated && (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                                        ✓ VALIDATED
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-gray-500">ID: </span>
                                <span className="text-primary font-mono">{data.ticketCode}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-t border-white/10">
                        <p className="text-center text-[10px] text-gray-400">
                            Present this ticket at entry • Powered by EventTix
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                {showActions && (
                    <div className="flex gap-3 no-print max-w-md mx-auto">
                        <Button
                            onClick={handleDownload}
                            variant="outline"
                            className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            className="flex-1 border-accent/30 text-accent hover:bg-accent/10"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button
                            onClick={handleShare}
                            variant="outline"
                            className="flex-1 border-secondary/30 text-secondary hover:bg-secondary/10"
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    </div>
                )}
            </div>
        );
    }
);

TicketPreview.displayName = "TicketPreview";
