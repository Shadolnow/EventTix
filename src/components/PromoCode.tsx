import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tag, Check, X, Loader2, Percent, Gift } from 'lucide-react';

interface PromoCodeInputProps {
    eventId: string;
    originalPrice: number;
    onApply: (discount: { code: string; discountPercent: number; discountAmount: number; finalPrice: number }) => void;
    onRemove: () => void;
}

interface PromoCode {
    id: string;
    code: string;
    discount_percent: number;
    discount_amount: number | null;
    max_uses: number | null;
    current_uses: number;
    valid_from: string | null;
    valid_until: string | null;
    min_purchase: number | null;
    is_active: boolean;
}

export const PromoCodeInput = ({ eventId, originalPrice, onApply, onRemove }: PromoCodeInputProps) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [appliedCode, setAppliedCode] = useState<PromoCode | null>(null);
    const [showInput, setShowInput] = useState(false);

    const validatePromoCode = async () => {
        if (!code.trim()) {
            toast.error('Please enter a promo code');
            return;
        }

        setLoading(true);

        try {
            // Check if promo code exists and is valid for this event
            // Note: promo_codes table needs to be created via migration first
            const { data: promoCode, error } = await (supabase as any)
                .from('promo_codes')
                .select('*')
                .eq('code', code.toUpperCase().trim())
                .eq('is_active', true)
                .or(`event_id.eq.${eventId},event_id.is.null`) // Event-specific or global
                .maybeSingle() as { data: PromoCode | null, error: any };

            if (error) throw error;

            if (!promoCode) {
                toast.error('Invalid promo code');
                setLoading(false);
                return;
            }

            // Check if code has reached max uses
            if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
                toast.error('This promo code has expired');
                setLoading(false);
                return;
            }

            // Check validity dates
            const now = new Date();
            if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
                toast.error('This promo code is not yet active');
                setLoading(false);
                return;
            }

            if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
                toast.error('This promo code has expired');
                setLoading(false);
                return;
            }

            // Check minimum purchase
            if (promoCode.min_purchase && originalPrice < promoCode.min_purchase) {
                toast.error(`Minimum purchase of ₹${promoCode.min_purchase} required`);
                setLoading(false);
                return;
            }

            // Calculate discount
            let discountAmount = 0;
            if (promoCode.discount_amount) {
                discountAmount = promoCode.discount_amount;
            } else if (promoCode.discount_percent) {
                discountAmount = Math.round(originalPrice * promoCode.discount_percent / 100);
            }

            const finalPrice = Math.max(0, originalPrice - discountAmount);

            setAppliedCode(promoCode);
            onApply({
                code: promoCode.code,
                discountPercent: promoCode.discount_percent || 0,
                discountAmount,
                finalPrice
            });

            toast.success(`🎉 Promo code applied! You save ₹${discountAmount}`);

        } catch (error) {
            console.error('Error validating promo code:', error);
            toast.error('Failed to validate promo code');
        } finally {
            setLoading(false);
        }
    };

    const removePromoCode = () => {
        setAppliedCode(null);
        setCode('');
        onRemove();
        toast.info('Promo code removed');
    };

    if (appliedCode) {
        return (
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg animate-in fade-in">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/20 border-green-500/50 text-green-400">
                        <Tag className="w-3 h-3 mr-1" />
                        {appliedCode.code}
                    </Badge>
                    <span className="text-sm text-green-400 font-medium">
                        {appliedCode.discount_percent
                            ? `${appliedCode.discount_percent}% OFF`
                            : `₹${appliedCode.discount_amount} OFF`}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={removePromoCode}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    if (!showInput) {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInput(true)}
                className="text-primary hover:text-primary/80"
            >
                <Tag className="w-4 h-4 mr-2" />
                Have a promo code?
            </Button>
        );
    }

    return (
        <div className="flex gap-2 animate-in slide-in-from-top-2">
            <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Enter promo code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && validatePromoCode()}
                />
            </div>
            <Button
                onClick={validatePromoCode}
                disabled={loading || !code.trim()}
                className="shrink-0"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    setShowInput(false);
                    setCode('');
                }}
                className="shrink-0"
            >
                <X className="w-4 h-4" />
            </Button>
        </div>
    );
};

// Price Display with Discount
interface PriceDisplayProps {
    originalPrice: number;
    discountAmount?: number;
    discountPercent?: number;
}

export const PriceDisplay = ({ originalPrice, discountAmount = 0, discountPercent }: PriceDisplayProps) => {
    const finalPrice = originalPrice - discountAmount;
    const hasDiscount = discountAmount > 0;

    return (
        <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ticket Price</span>
                <span className={hasDiscount ? 'line-through text-muted-foreground' : 'font-bold text-lg'}>
                    ₹{originalPrice}
                </span>
            </div>

            {hasDiscount && (
                <>
                    <div className="flex justify-between items-center text-green-400">
                        <span className="flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            Discount {discountPercent ? `(${discountPercent}%)` : ''}
                        </span>
                        <span>-₹{discountAmount}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between items-center">
                        <span className="font-semibold">You Pay</span>
                        <span className="text-xl font-bold text-primary">₹{finalPrice}</span>
                    </div>
                </>
            )}

            {!hasDiscount && (
                <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary">₹{originalPrice}</span>
                </div>
            )}
        </div>
    );
};
