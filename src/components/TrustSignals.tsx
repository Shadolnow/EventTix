import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, CreditCard, RefreshCcw, CheckCircle2, Star, Quote } from 'lucide-react';

export const TrustBadges = () => {
    return (
        <div className="flex flex-wrap justify-center gap-4 py-4">
            <Badge variant="outline" className="flex items-center gap-2 py-2 px-4 bg-green-500/10 border-green-500/30 text-green-400">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium">Secure Checkout</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 py-2 px-4 bg-blue-500/10 border-blue-500/30 text-blue-400">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">256-bit SSL</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 py-2 px-4 bg-purple-500/10 border-purple-500/30 text-purple-400">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-medium">Verified Payments</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 py-2 px-4 bg-orange-500/10 border-orange-500/30 text-orange-400">
                <RefreshCcw className="w-4 h-4" />
                <span className="text-xs font-medium">Easy Refunds</span>
            </Badge>
        </div>
    );
};

export const RefundPolicy = () => {
    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 text-primary" />
                    Refund & Cancellation Policy
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Full refund if event is cancelled by organizer</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Refund available up to 48 hours before event</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Ticket transfers allowed at no extra cost</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <span>Processing fee (if any) is non-refundable</span>
                </div>
            </CardContent>
        </Card>
    );
};

const testimonials = [
    {
        name: "Priya S.",
        rating: 5,
        text: "Super smooth ticket booking! Got my QR code instantly. The venue entry was hassle-free.",
        event: "NYE 2024"
    },
    {
        name: "Rahul M.",
        rating: 5,
        text: "Best ticketing experience ever. The app saved my ticket offline when the venue had poor network!",
        event: "Tech Conference"
    },
    {
        name: "Sneha K.",
        rating: 5,
        text: "Loved the instant ticket delivery. The Apple Wallet integration is a game changer!",
        event: "Music Festival"
    }
];

export const Testimonials = () => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                What Our Users Say
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
                {testimonials.map((testimonial, index) => (
                    <Card key={index} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                        <CardContent className="pt-4 space-y-3">
                            <Quote className="w-6 h-6 text-primary/50" />
                            <p className="text-sm text-muted-foreground italic">
                                "{testimonial.text}"
                            </p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">{testimonial.name}</p>
                                    <p className="text-xs text-muted-foreground">{testimonial.event}</p>
                                </div>
                                <div className="flex gap-0.5">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export const SecuritySection = () => {
    return (
        <div className="bg-gradient-to-r from-green-500/5 via-blue-500/5 to-purple-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center justify-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-green-400">Secure Payment</p>
                        <p className="text-[10px] text-muted-foreground">Bank-level encryption</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-blue-400">Data Protected</p>
                        <p className="text-[10px] text-muted-foreground">GDPR compliant</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-purple-400">Guaranteed Entry</p>
                        <p className="text-[10px] text-muted-foreground">100% authentic tickets</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
