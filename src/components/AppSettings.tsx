import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Volume2, VolumeX, Smartphone, Bell, BellOff } from 'lucide-react';
import { useFeedback } from '@/lib/feedback';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

export const AppSettings = () => {
    const { soundEnabled, hapticEnabled, toggleSound, toggleHaptic } = useFeedback();
    const [soundOn, setSoundOn] = useState(soundEnabled);
    const [hapticOn, setHapticOn] = useState(hapticEnabled);

    const handleSoundToggle = () => {
        const newState = toggleSound();
        setSoundOn(newState);
    };

    const handleHapticToggle = () => {
        const newState = toggleHaptic();
        setHapticOn(newState);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how EventTix looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Theme</Label>
                            <p className="text-sm text-muted-foreground">
                                Choose your preferred color scheme
                            </p>
                        </div>
                        <ThemeToggle />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sound & Haptics</CardTitle>
                    <CardDescription>Enhance your experience with audio and tactile feedback</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex items-center gap-3">
                            {soundOn ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                            <div>
                                <Label htmlFor="sound-toggle">Sound Effects</Label>
                                <p className="text-sm text-muted-foreground">
                                    Button clicks, success chimes, payment sounds
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="sound-toggle"
                            checked={soundOn}
                            onCheckedChange={handleSoundToggle}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex items-center gap-3">
                            <Smartphone className={`w-5 h-5 ${hapticOn ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div>
                                <Label htmlFor="haptic-toggle">Haptic Feedback</Label>
                                <p className="text-sm text-muted-foreground">
                                    Vibration feedback on mobile devices
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="haptic-toggle"
                            checked={hapticOn}
                            onCheckedChange={handleHapticToggle}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Stay updated about your events and tickets</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex items-center gap-3">
                            {Notification.permission === 'granted' ? (
                                <Bell className="w-5 h-5 text-primary" />
                            ) : (
                                <BellOff className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                                <Label>Push Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    {Notification.permission === 'granted'
                                        ? 'Enabled - You\'ll receive event updates'
                                        : Notification.permission === 'denied'
                                            ? 'Blocked - Enable in browser settings'
                                            : 'Click to enable notifications'}
                                </p>
                            </div>
                        </div>
                        {Notification.permission === 'default' && (
                            <button
                                onClick={() => Notification.requestPermission()}
                                className="text-sm text-primary hover:underline"
                            >
                                Enable
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
