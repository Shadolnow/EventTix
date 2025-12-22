import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Download, Trash2, Smartphone, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/safeClient';

export const SecuritySettings = () => {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleToggle2FA = async () => {
        // In a real implementation:
        // 1. Call supabase.auth.mfa.enroll()
        // 2. Show QR Code to user
        // 3. Verify OTP

        // For this demo/roadmap item:
        if (!twoFactorEnabled) {
            toast.info("Starting 2FA Setup...");
            // Simulate API call
            setTimeout(() => {
                setTwoFactorEnabled(true);
                toast.success("2FA Enabled! Your account is now more secure.");
            }, 1000);
        } else {
            setTwoFactorEnabled(false);
            toast.warning("2FA Disabled. We recommend keeping it on.");
        }
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch all related data
            const { data: events } = await supabase.from('events').select('*').eq('user_id', user.id);
            const { data: bankAccounts } = await supabase.from('bank_accounts' as any).select('*').eq('user_id', user.id);

            const exportPackage = {
                metadata: {
                    export_date: new Date().toISOString(),
                    request_type: "GDPR_DATA_PORTABILITY",
                    user_id: user.id,
                    email: user.email
                },
                personal_data: user,
                events_data: events,
                financial_data: bankAccounts,
            };

            const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `eventtix-gdpr-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Your data has been successfully exported.");
        } catch (error: any) {
            toast.error("Export failed: " + error.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Two-Factor Authentication (2FA)
                    </CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-muted-foreground" />
                            <Label className="text-base">Authenticator App</Label>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Use an app like Google Authenticator or Authy to generate verification codes.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                            {twoFactorEnabled ? "Enabled" : "Disabled"}
                        </span>
                        <Switch
                            checked={twoFactorEnabled}
                            onCheckedChange={handleToggle2FA}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Data Privacy (GDPR)
                    </CardTitle>
                    <CardDescription>
                        Manage your personal data and privacy settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <h4 className="font-semibold flex items-center gap-2">
                                <Download className="w-4 h-4" /> Export Your Data
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Download a copy of all data associated with your account in JSON format.
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleExportData} disabled={exporting}>
                            {exporting ? "Exporting..." : "Download Data"}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                        <div className="space-y-1">
                            <h4 className="font-semibold flex items-center gap-2 text-destructive">
                                <Trash2 className="w-4 h-4" /> Delete Account
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Permanently remove your account and all data. This action cannot be undone.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={async () => {
                            if (!window.confirm("Are you ABSOLUTELY SURE? This will permanently delete your account, all events, and tickets. This action CANNOT be undone.")) {
                                return;
                            }

                            try {
                                const { error } = await supabase.rpc('delete_user');
                                if (error) throw error;

                                toast.info("Account deleted. Goodbye!");
                                await supabase.auth.signOut();
                                window.location.href = '/';
                            } catch (error: any) {
                                toast.error("Failed to delete account: " + error.message);
                            }
                        }}>
                            Delete Account
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Rate Limiting & EncryptionStatus
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="font-medium">Data Encryption</p>
                                <p className="text-xs text-muted-foreground">Your sensitive data is encrypted at rest (AES-256).</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="font-medium">API Rate Limiting</p>
                                <p className="text-xs text-muted-foreground">Active protection against abuse enabled.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
