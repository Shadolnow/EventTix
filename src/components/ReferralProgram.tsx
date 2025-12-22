import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Gift, Copy, Share2, Users, IndianRupee, Check, Sparkles } from 'lucide-react';

interface ReferralBannerProps {
    eventId: string;
    eventTitle: string;
    referralDiscount?: number; // Amount in INR
    onApplyReferral?: (referralCode: string) => void;
}

export const ReferralBanner = ({
    eventId,
    eventTitle,
    referralDiscount = 200,
    onApplyReferral
}: ReferralBannerProps) => {
    const [referralCode, setReferralCode] = useState('');
    const [showInput, setShowInput] = useState(false);

    const handleApply = () => {
        if (!referralCode.trim()) {
            toast.error('Please enter a referral code');
            return;
        }

        // In production, this would validate with backend
        if (onApplyReferral) {
            onApplyReferral(referralCode.toUpperCase());
        }

        toast.success(`🎉 Referral code applied! You get ₹${referralDiscount} off!`);
    };

    return (
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Got a referral?</h4>
                    <p className="text-xs text-muted-foreground">
                        Get ₹{referralDiscount} OFF with a friend's code!
                    </p>
                </div>
            </div>

            {!showInput ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInput(true)}
                    className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Enter Referral Code
                </Button>
            ) : (
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., JOHN2024"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="uppercase"
                    />
                    <Button onClick={handleApply} size="sm">Apply</Button>
                </div>
            )}
        </div>
    );
};

interface ShareReferralCardProps {
    userReferralCode: string;
    eventTitle: string;
    eventUrl: string;
    referralDiscount?: number;
    referralEarnings?: number;
    totalReferrals?: number;
}

export const ShareReferralCard = ({
    userReferralCode,
    eventTitle,
    eventUrl,
    referralDiscount = 200,
    referralEarnings = 0,
    totalReferrals = 0
}: ShareReferralCardProps) => {
    const [copied, setCopied] = useState(false);

    const referralLink = `${eventUrl}?ref=${userReferralCode}`;
    const shareMessage = `🎫 Get ₹${referralDiscount} OFF on ${eventTitle}! Use my referral code: ${userReferralCode}\n\nBook now: ${referralLink}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast.success('Referral link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const shareReferral = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Get ₹${referralDiscount} OFF on ${eventTitle}!`,
                    text: shareMessage,
                    url: referralLink
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            copyToClipboard();
        }
    };

    const shareOnWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(url, '_blank');
    };

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    Share & Earn ₹{referralDiscount}
                </CardTitle>
                <CardDescription>
                    Share your code with friends. When they buy, you both get ₹{referralDiscount}!
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Referral Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg text-center">
                        <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                        <p className="text-2xl font-bold">{totalReferrals}</p>
                        <p className="text-xs text-muted-foreground">Friends Referred</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                        <IndianRupee className="w-5 h-5 mx-auto text-green-400 mb-1" />
                        <p className="text-2xl font-bold text-green-400">₹{referralEarnings}</p>
                        <p className="text-xs text-muted-foreground">Total Earned</p>
                    </div>
                </div>

                {/* Referral Code */}
                <div className="p-4 bg-background border border-dashed border-primary/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
                    <p className="text-2xl font-bold text-primary font-mono tracking-widest">
                        {userReferralCode}
                    </p>
                </div>

                {/* Copy Link */}
                <div className="flex gap-2">
                    <Input
                        value={referralLink}
                        readOnly
                        className="text-xs bg-muted"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={copyToClipboard}
                        className={copied ? 'bg-green-500/10 border-green-500/50' : ''}
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Share Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={shareOnWhatsApp}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Share on WhatsApp
                    </Button>
                    <Button
                        variant="outline"
                        onClick={shareReferral}
                        className="flex-1"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// Generate a unique referral code for a user
export const generateReferralCode = (userName: string): string => {
    const cleanName = userName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${cleanName}${randomNum}`;
};
