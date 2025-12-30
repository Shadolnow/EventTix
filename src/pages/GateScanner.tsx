import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, RotateCcw, Volume2, VolumeX, Keyboard } from 'lucide-react';

interface ScanRecord {
    id: string;
    ticketCode: string;
    status: 'valid' | 'invalid' | 'already-used' | 'error';
    attendeeName?: string;
    timestamp: Date;
}

const GateScanner = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();

    // State
    const [isScanning, setIsScanning] = useState(true);
    const [scanResult, setScanResult] = useState<ScanRecord | null>(null);
    const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
    const [eventDetails, setEventDetails] = useState<any>(null);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [manualCode, setManualCode] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 });
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        if (eventId) {
            fetchEventDetails();
            fetchStats();
        }
    }, [eventId]);

    const speak = (text: string) => {
        if (!isVoiceEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    const fetchEventDetails = async () => {
        const { data } = await supabase
            .from('events')
            .select('title, venue, id')
            .eq('id', eventId)
            .single();
        if (data) setEventDetails(data);
    };

    const fetchStats = async () => {
        const { data: tickets } = await supabase
            .from('tickets')
            .select('id, validated')
            .eq('event_id', eventId);

        if (tickets) {
            const total = tickets.length;
            const valid = tickets.filter(t => t.validated).length;
            setStats({ total, valid, invalid: 0 });
        }
    };

    const validateTicket = useCallback(async (ticketCode: string) => {
        // Pause scanning
        setIsScanning(false);

        console.log('🎫 Validating ticket:', ticketCode);

        try {
            // Find ticket
            const { data: ticket, error } = await supabase
                .from('tickets')
                .select('*, events(title), ticket_tiers(name)')
                .eq('ticket_code', ticketCode)
                .single();

            if (error || !ticket) {
                const record: ScanRecord = {
                    id: Date.now().toString(),
                    ticketCode,
                    status: 'invalid',
                    timestamp: new Date()
                };
                setScanResult(record);
                setScanHistory(prev => [record, ...prev.slice(0, 9)]);
                speak('Invalid ticket');
                toast.error('Invalid Ticket', { description: 'Ticket not found in system' });
                return;
            }

            // Check if wrong event
            if (ticket.event_id !== eventId) {
                const record: ScanRecord = {
                    id: Date.now().toString(),
                    ticketCode,
                    status: 'invalid',
                    attendeeName: ticket.attendee_name,
                    timestamp: new Date()
                };
                setScanResult(record);
                setScanHistory(prev => [record, ...prev.slice(0, 9)]);
                speak('Wrong event');
                toast.error('Wrong Event', { description: 'This ticket is for a different event' });
                return;
            }

            // Check if already validated
            if (ticket.validated) {
                const record: ScanRecord = {
                    id: Date.now().toString(),
                    ticketCode,
                    status: 'already-used',
                    attendeeName: ticket.attendee_name,
                    timestamp: new Date()
                };
                setScanResult(record);
                setScanHistory(prev => [record, ...prev.slice(0, 9)]);
                speak('Already used');
                toast.warning('Already Scanned', { description: `${ticket.attendee_name} has already entered` });
                return;
            }

            // Validate the ticket
            const { error: updateError } = await supabase
                .from('tickets')
                .update({
                    validated: true,
                    checked_in_at: new Date().toISOString()
                })
                .eq('id', ticket.id);

            if (updateError) {
                throw updateError;
            }

            // Success!
            const tierName = ticket.ticket_tiers?.name || 'General';
            const record: ScanRecord = {
                id: Date.now().toString(),
                ticketCode,
                status: 'valid',
                attendeeName: ticket.attendee_name,
                timestamp: new Date()
            };
            setScanResult(record);
            setScanHistory(prev => [record, ...prev.slice(0, 9)]);

            // Update stats
            setStats(prev => ({ ...prev, valid: prev.valid + 1 }));

            // Voice and toast
            speak(`Entry valid. ${tierName}`);
            toast.success('Entry Valid!', { description: `${ticket.attendee_name} - ${tierName}` });

        } catch (err) {
            console.error('Validation error:', err);
            const record: ScanRecord = {
                id: Date.now().toString(),
                ticketCode,
                status: 'error',
                timestamp: new Date()
            };
            setScanResult(record);
            speak('Error');
            toast.error('Error', { description: 'Failed to validate ticket' });
        }
    }, [eventId, isVoiceEnabled]);

    const handleScan = useCallback((result: any[]) => {
        if (result && result.length > 0) {
            const code = result[0].rawValue;
            if (code) {
                // Vibrate
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
                validateTicket(code);
            }
        }
    }, [validateTicket]);

    const handleReset = () => {
        setScanResult(null);
        setIsScanning(true);
    };

    const handleManualEntry = () => {
        if (manualCode.trim()) {
            validateTicket(manualCode.trim());
            setManualCode('');
            setShowManualEntry(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid': return 'text-green-500';
            case 'invalid': return 'text-red-500';
            case 'already-used': return 'text-yellow-500';
            default: return 'text-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'valid': return <CheckCircle className="w-16 h-16 text-green-500" />;
            case 'invalid': return <XCircle className="w-16 h-16 text-red-500" />;
            case 'already-used': return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b border-border p-4">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="text-center">
                        <h1 className="font-bold text-lg">{eventDetails?.title || 'Gate Scanner'}</h1>
                        <p className="text-xs text-muted-foreground">{eventDetails?.venue}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    >
                        {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-6 p-4 bg-secondary/50">
                <div className="text-center">
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">{stats.valid}</p>
                    <p className="text-xs text-muted-foreground">Entered</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold">{Math.round((stats.valid / stats.total) * 100) || 0}%</p>
                    <p className="text-xs text-muted-foreground">Progress</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-md mx-auto p-4">
                {/* Scanner or Result */}
                {scanResult ? (
                    // Show Result
                    <Card className="overflow-hidden">
                        <CardContent className="p-8 text-center">
                            <div className="flex justify-center mb-4">
                                {getStatusIcon(scanResult.status)}
                            </div>
                            <h2 className={`text-2xl font-bold mb-2 ${getStatusColor(scanResult.status)}`}>
                                {scanResult.status === 'valid' && 'ENTRY VALID'}
                                {scanResult.status === 'invalid' && 'INVALID TICKET'}
                                {scanResult.status === 'already-used' && 'ALREADY USED'}
                                {scanResult.status === 'error' && 'ERROR'}
                            </h2>
                            {scanResult.attendeeName && (
                                <p className="text-lg mb-4">{scanResult.attendeeName}</p>
                            )}
                            <p className="text-sm text-muted-foreground font-mono mb-6">
                                {scanResult.ticketCode}
                            </p>
                            <Button onClick={handleReset} className="w-full" size="lg">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Scan Next
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    // Show Scanner
                    <div className="space-y-4">
                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary border-2 border-primary/30">
                            {isScanning && !cameraError ? (
                                <>
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(err) => {
                                            console.error('Camera error:', err);
                                            setCameraError(err instanceof Error ? err.message : 'Camera error');
                                        }}
                                        constraints={{
                                            facingMode: 'environment'
                                        }}
                                        styles={{
                                            container: { width: '100%', height: '100%' },
                                            video: { objectFit: 'cover' },
                                        }}
                                    />
                                    {/* Corner markers */}
                                    <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg pointer-events-none" />
                                    <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg pointer-events-none" />
                                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg pointer-events-none" />
                                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg pointer-events-none" />
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                                    {cameraError ? (
                                        <>
                                            <XCircle className="w-12 h-12 mb-4 text-destructive" />
                                            <p className="text-center mb-2">Camera Error</p>
                                            <p className="text-xs text-center">{cameraError}</p>
                                            <Button
                                                variant="outline"
                                                className="mt-4"
                                                onClick={() => {
                                                    setCameraError(null);
                                                    setIsScanning(true);
                                                }}
                                            >
                                                Try Again
                                            </Button>
                                        </>
                                    ) : (
                                        <p className="text-center font-mono">Scanner paused</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Scanning indicator */}
                        {isScanning && !cameraError && (
                            <div className="flex items-center justify-center gap-3">
                                <div className="relative">
                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary animate-ping" />
                                </div>
                                <span className="text-sm font-mono text-muted-foreground">
                                    Point camera at QR code...
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Entry Toggle */}
                <div className="mt-6">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowManualEntry(!showManualEntry)}
                    >
                        <Keyboard className="w-4 h-4 mr-2" />
                        {showManualEntry ? 'Hide Manual Entry' : 'Enter Code Manually'}
                    </Button>

                    {showManualEntry && (
                        <div className="mt-4 flex gap-2">
                            <Input
                                placeholder="Enter ticket code..."
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualEntry()}
                            />
                            <Button onClick={handleManualEntry}>Validate</Button>
                        </div>
                    )}
                </div>

                {/* Recent Scans */}
                {scanHistory.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold mb-2">Recent Scans</h3>
                        <div className="space-y-2">
                            {scanHistory.slice(0, 5).map((record) => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${record.status === 'valid' ? 'bg-green-500' :
                                                record.status === 'already-used' ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                            }`} />
                                        <span className="truncate max-w-[150px]">
                                            {record.attendeeName || record.ticketCode}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {record.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GateScanner;
