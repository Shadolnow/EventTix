import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Flashlight, Camera, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const DoorStaffScanner = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{
        status: 'valid' | 'invalid' | 'warning' | 'error';
        message: string;
        attendee?: any;
    } | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameraId, setCameraId] = useState<string | null>(null);
    const [eventDetails, setEventDetails] = useState<any>(null);

    useEffect(() => {
        if (eventId) {
            fetchEventDetails();
        }
        return () => {
            stopScanner();
        };
    }, [eventId]);

    const fetchEventDetails = async () => {
        const { data } = await supabase.from('events').select('title, venue').eq('id', eventId).single();
        if (data) setEventDetails(data);
    };

    const startScanner = async () => {
        if (scannerRef.current) return;

        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length) {
                // Prefer back camera
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
                const targetId = backCamera ? backCamera.id : devices[0].id;
                setCameraId(targetId);

                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    targetId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        handleScan(decodedText);
                    },
                    (errorMessage) => {
                        // ignore default errors
                    }
                );
                setScanning(true);
                setScanResult(null);
            } else {
                toast.error("No camera found");
            }
        } catch (err) {
            console.error("Scanner error", err);
            toast.error("Failed to start scanner");
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
                setScanning(false);
            } catch (err) {
                console.error("Error stopping scanner", err);
            }
        }
    };

    const handleScan = async (ticketCode: string) => {
        // Pause scanning to process
        if (scannerRef.current) {
            scannerRef.current.pause(true);
        }

        try {
            // Verify Logic
            // 1. Fetch ticket
            const { data: ticket, error } = await supabase
                .from('tickets')
                .select('*, transactions(payment_status)')
                .eq('ticket_code', ticketCode)
                .single(); // Assuming unique ticket_code globally or check event_id

            if (error || !ticket) {
                playSound('error');
                setScanResult({
                    status: 'error',
                    message: 'Ticket Not Found'
                });
                return;
            }

            // 2. Check Event ID
            if (ticket.event_id !== eventId) {
                playSound('error');
                setScanResult({
                    status: 'invalid',
                    message: 'Wrong Event Ticket',
                    attendee: { name: ticket.attendee_name }
                });
                return;
            }

            // 3. Check Status
            // Check payment status from transaction or local status
            // Assuming tickets table has payment_status or linked transaction
            // Legacy check: ticket.payment_status (if exists on ticket) or linked transaction
            let isPaid = ticket.payment_status === 'paid' || ticket.payment_status === 'success';

            // If linked transaction, check that
            if (ticket.transactions && ticket.transactions.payment_status === 'success') {
                isPaid = true;
            }

            if (!isPaid) {
                playSound('error');
                setScanResult({
                    status: 'invalid',
                    message: 'Not Paid',
                    attendee: { name: ticket.attendee_name, email: ticket.attendee_email }
                });
                return;
            }

            // 4. Check Check-in Status
            if (ticket.checked_in_at) {
                playSound('warning');
                setScanResult({
                    status: 'warning',
                    message: 'Already Checked In',
                    attendee: {
                        name: ticket.attendee_name,
                        email: ticket.attendee_email,
                        time: new Date(ticket.checked_in_at).toLocaleTimeString()
                    }
                });
            } else {
                // Success - Check in
                const { error: updateError } = await supabase
                    .from('tickets')
                    .update({ checked_in_at: new Date().toISOString() })
                    .eq('id', ticket.id);

                if (updateError) throw updateError;

                playSound('success');
                setScanResult({
                    status: 'valid',
                    message: 'Check-in Successful',
                    attendee: { name: ticket.attendee_name, email: ticket.attendee_email }
                });
            }

        } catch (err) {
            console.error(err);
            setScanResult({ status: 'error', message: 'Verification Failed' });
        } finally {
            // Resume scanning after 3 seconds
            setTimeout(() => {
                if (scannerRef.current) {
                    scannerRef.current.resume();
                    setScanResult(null);
                }
            }, 3000);
        }
    };

    const playSound = (type: 'success' | 'error' | 'warning') => {
        // Simple beep implementation
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'error') {
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.type = 'sawtooth';
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else {
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" className="text-white hover:text-white/80" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="text-center">
                    <h2 className="font-bold text-lg">{eventDetails?.title || 'Event Scanner'}</h2>
                    <p className="text-xs text-gray-400">{eventDetails?.venue || 'Checking Access...'}</p>
                </div>
                <div className="w-6" /> {/* Spacer */}
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex flex-col justify-center items-center relative gap-4">
                <div id="reader" className="w-full max-w-sm rounded-xl overflow-hidden border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] bg-gray-900 min-h-[300px]" />

                {!scanning && (
                    <Button onClick={startScanner} size="lg" className="w-full max-w-sm bg-gradient-to-r from-cyan-500 to-purple-600">
                        <Camera className="w-4 h-4 mr-2" /> Start Camera
                    </Button>
                )}

                {/* Result Overlay */}
                {scanResult && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <Card className={`w-full max-w-sm border-2 ${scanResult.status === 'valid' ? 'border-green-500 bg-green-950/30' :
                                scanResult.status === 'warning' ? 'border-amber-500 bg-amber-950/30' :
                                    'border-red-500 bg-red-950/30'
                            } text-white`}>
                            <CardContent className="flex flex-col items-center p-8 text-center space-y-4">
                                {scanResult.status === 'valid' && <CheckCircle className="w-20 h-20 text-green-500" />}
                                {scanResult.status === 'error' && <XCircle className="w-20 h-20 text-red-500" />}
                                {scanResult.status === 'invalid' && <XCircle className="w-20 h-20 text-red-500" />}
                                {scanResult.status === 'warning' && <AlertTriangle className="w-20 h-20 text-amber-500" />}

                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold uppercase tracking-wider">{scanResult.message}</h2>
                                    {scanResult.attendee && (
                                        <div className="text-sm opacity-80 mt-2">
                                            <p className="font-semibold text-lg">{scanResult.attendee.name}</p>
                                            <p>{scanResult.attendee.email}</p>
                                            {scanResult.attendee.time && <p>Checked in at: {scanResult.attendee.time}</p>}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
                Point camera at ticket QR code. Keep checking in attendees.
            </p>
        </div>
    );
};

export default DoorStaffScanner;
