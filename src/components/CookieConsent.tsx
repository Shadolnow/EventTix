import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Cookie, Shield } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Show after a small delay
            setTimeout(() => setIsVisible(true), 1000);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookie-consent', 'declined');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full"
                >
                    <Card className="p-4 border-l-4 border-l-primary shadow-2xl bg-card/95 backdrop-blur-sm">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Cookie className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-lg">Cookies & Privacy</h4>
                                    <button onClick={handleDecline} className="text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.
                                    We also prioritize your data security with GDPR-compliant tools.
                                </p>
                                <div className="flex gap-2 pt-2">
                                    <Button size="sm" onClick={handleAccept} className="bg-primary text-primary-foreground">
                                        Accept All
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleDecline}>
                                        Necessary Only
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
