import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X, BellOff } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Push Notification Opt-In Component
 * Requests permission and subscribes to push notifications
 */
const PushNotificationPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('Push notifications not supported');
            return;
        }

        setPermission(Notification.permission);

        // Show prompt after 10 seconds if not already decided
        if (Notification.permission === 'default') {
            const dismissed = localStorage.getItem('push-notification-dismissed');
            if (!dismissed) {
                setTimeout(() => {
                    setShowPrompt(true);
                }, 10000); // 10 seconds delay
            }
        }
    }, []);

    const requestPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);

            if (permission === 'granted') {
                toast.success('🔔 Notifications enabled! You\'ll get event updates.');

                // Subscribe to push notifications
                if ('serviceWorker' in navigator && 'PushManager' in window) {
                    const registration = await navigator.serviceWorker.ready;

                    // In production, you'd subscribe to your push service here
                    console.log('Push notification subscription ready:', registration);

                    // Store preference
                    localStorage.setItem('push-notifications-enabled', 'true');
                }
            } else if (permission === 'denied') {
                toast.error('Notifications blocked. Enable them in browser settings if needed.');
            }

            setShowPrompt(false);
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            toast.error('Failed to enable notifications');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('push-notification-dismissed', 'true');
    };

    // Don't show if already decided or dismissed
    if (!showPrompt || permission !== 'default') return null;

    return (
        <Card className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 border-2 border-accent/30 bg-card/95 backdrop-blur-lg shadow-lg animate-in slide-in-from-bottom-5">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="font-semibold">Stay Updated</h3>
                                <p className="text-xs text-muted-foreground">
                                    Get notified about your tickets, events, and updates
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 -mr-2"
                                onClick={handleDismiss}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-accent to-purple-600"
                                onClick={requestPermission}
                            >
                                <Bell className="w-4 h-4 mr-2" />
                                Enable
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDismiss}
                            >
                                <BellOff className="w-4 h-4 mr-2" />
                                No thanks
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PushNotificationPrompt;

// Utility function to send local notification
export const sendLocalNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            icon: '/logo.png',
            badge: '/badge-icon.png',
            ...options,
        });
    }
};
