import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, CheckCircle2, Clock, Copy, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface QRPaymentProps {
    amount: number;
    orderId: string;
    upiId: string;
    merchantName?: string;
    onPaymentConfirm: (transactionId?: string) => Promise<void>;
    isLoading?: boolean;
}

export function QRPayment({
    amount,
    orderId,
    upiId,
    merchantName = "EventTix",
    onPaymentConfirm,
    isLoading = false
}: QRPaymentProps) {
    const [transactionId, setTransactionId] = useState("");

    // Generate UPI payment URL (works with GPay, PhonePe, Paytm, etc.)
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`TICKET-${orderId}`)}`;

    const copyUpiId = () => {
        navigator.clipboard.writeText(upiId);
        toast.success("UPI ID copied to clipboard!");
    };

    const handleConfirm = async () => {
        if (!transactionId || transactionId.trim().length < 6) {
            toast.error("Please enter a valid UPI Transaction ID (minimum 6 characters)");
            return;
        }
        await onPaymentConfirm(transactionId);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="font-semibold text-xl text-primary mb-2">
                    Scan QR to Pay
                </h3>
                <p className="text-muted-foreground text-sm">
                    Use any UPI app to complete payment
                </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-primary/20">
                    <QRCodeSVG
                        value={upiUrl}
                        size={200}
                        level="H"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#0a0a1a"
                    />
                </div>
            </div>

            {/* Amount Display */}
            <div className="text-center">
                <p className="text-muted-foreground text-sm">Amount to Pay</p>
                <p className="text-3xl font-black text-gradient-cyber">
                    ₹{amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Order ID: {orderId}</p>
            </div>

            {/* UPI ID */}
            <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-muted-foreground text-xs">UPI ID</p>
                        <p className="font-mono text-foreground">{upiId}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyUpiId}
                        className="text-primary hover:bg-primary/20"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Transaction ID Input */}
            <div className="space-y-2">
                <Label htmlFor="transactionId" className="text-sm">
                    UPI Transaction ID <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="transactionId"
                    placeholder="Enter UPI reference number (min 6 characters)"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="bg-muted border-border focus:border-primary font-mono"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Found in your UPI app's payment success screen. Required for verification.
                </p>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary font-bold text-xs">1</span>
                    </div>
                    <p className="text-muted-foreground">
                        Open any UPI app (Google Pay, PhonePe, Paytm, etc.)
                    </p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary font-bold text-xs">2</span>
                    </div>
                    <p className="text-muted-foreground">
                        Scan the QR code or enter the UPI ID manually
                    </p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary font-bold text-xs">3</span>
                    </div>
                    <p className="text-muted-foreground">
                        Complete the payment and enter the Transaction ID below
                    </p>
                </div>
            </div>

            {/* Supported Apps */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="w-4 h-4" />
                <span>Works with all UPI apps</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
                <Button
                    onClick={handleConfirm}
                    disabled={isLoading || transactionId.length < 6}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-primary hover:from-green-500/80 hover:to-primary/80 text-white font-bold"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Verifying Payment...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            I've Completed Payment
                        </>
                    )}
                </Button>

                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-xs text-yellow-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Payment verification may take a few moments
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}
