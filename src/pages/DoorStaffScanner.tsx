import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Flashlight, Camera, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';

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
    const [cameraId, setCameraId] = useState<string | null>(localStorage.getItem('preferred_camera'));
    const [eventDetails, setEventDetails] = useState<any>(null);
    const [scannerStatus, setScannerStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
    const [accessible, setAccessible] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [availableCameras, setAvailableCameras] = useState<any[]>([]);
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [hasTorch, setHasTorch] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    useEffect(() => {
        if (eventId) {
            fetchEventDetails();
        }
        return () => {
            stopScanner();
        };
    }, [eventId]);

    const fetchEventDetails = async () => {
        const { data } = await supabase.from('events').select('title, venue, id').eq('id', eventId).single();
        if (data) setEventDetails(data);
    };

    const handleVerifyAccess = async () => {
        if (!accessCode || accessCode.length < 6) {
            toast.error("Enter valid 6-digit access code");
            return;
        }

        setVerifying(true);
        try {
            const { data, error } = await (supabase as any)
                .from('door_staff')
                .select('*')
                .eq('event_id', eventId)
                .eq('access_code', accessCode)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                toast.error("Invalid or expired access code");
                return;
            }

            setAccessible(true);
            toast.success("Access Granted! Welcome.");
        } catch (err) {
            toast.error("Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    const startScanner = async () => {
        if (scannerRef.current) return;

        try {
            setScanning(true);
            setScanResult(null);
            setScannerStatus('starting');

            // Get cameras for selection
            const devices = await Html5Qrcode.getCameras().catch(() => []);
            setAvailableCameras(devices);

            // Small delay for DOM to render the container
            await new Promise(resolve => setTimeout(resolve, 300));

            const html5QrCode = new Html5Qrcode("reader", { verbose: false });
            scannerRef.current = html5QrCode;

            let targetCamera: any = { facingMode: "environment" };

            // If we have a preferred camera ID, use it, otherwise stay with environment mode
            if (cameraId && devices.some(d => d.id === cameraId)) {
                targetCamera = cameraId;
            }

            await html5QrCode.start(
                targetCamera,
                {
                    fps: 20,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const size = Math.floor(minEdge * 0.85);
                        return { width: size, height: size };
                    },
                    aspectRatio: 1.0,
                    disableFlip: true,
                    videoConstraints: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                },
                (decodedText) => {
                    if (navigator.vibrate) navigator.vibrate(100);
                    handleScan(decodedText);
                },
                (errorMessage) => {
                    // silently handle frame errors
                }
            ).then(() => {
                setScannerStatus('scanning');
                // Check torch
                const track = (html5QrCode as any).getRunningTrack();
                if (track) {
                    const caps = track.getCapabilities();
                    setHasTorch(!!caps.torch);
                }
            });
        } catch (err: any) {
            console.error("Scanner error", err);
            setScanning(false);
            setScannerStatus('error');
            toast.error("Could not start camera. Check permissions.");
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
                scannerRef.current = null;
                setScanning(false);
                setScannerStatus('idle');
                setIsTorchOn(false);
            } catch (err) {
                console.error("Error stopping scanner", err);
            }
        }
    };

    const toggleTorch = async () => {
        if (!scannerRef.current || !hasTorch) return;
        try {
            const newState = !isTorchOn;
            await (scannerRef.current as any).applyVideoConstraints({
                advanced: [{ torch: newState }]
            });
            setIsTorchOn(newState);
        } catch (e) {
            toast.error("Torch error");
        }
    };

    const updateRecentScans = (ticket: any, status: 'valid' | 'invalid' | 'warning') => {
        const newScan = {
            id: Date.now(),
            name: ticket.attendee_name,
            tier: ticket.tier_name || 'General',
            status,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setRecentScans(prev => [newScan, ...prev].slice(0, 5));
    };

    const handleCameraChange = async (newId: string) => {
        setCameraId(newId);
        localStorage.setItem('preferred_camera', newId);
        if (scanning) {
            await stopScanner();
            // Small delay to let the camera hardware release
            setTimeout(startScanner, 300);
        }
    };

    const handleScan = async (ticketCode: string) => {
        // Pause scanning to process
        if (scannerRef.current) {
            scannerRef.current.pause(true);
        }

        try {
            // Verify Logic
            // 1. Fetch ticket using Secure RPC (Prevents data harvesting)
            const { data: ticket, error: rpcError } = await supabase.rpc('verify_ticket_as_staff', {
                p_ticket_code: ticketCode,
                p_access_code: accessCode
            });

            if (rpcError || !ticket) {
                console.error("RPC Error:", rpcError);
                playSound('error');
                setScanResult({
                    status: 'error',
                    message: rpcError?.message?.includes('access code') ? 'Invalid Session' : 'Ticket Not Found'
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

            // 3. Check Payment Status
            const isPaid = (ticket as any).payment_status === 'paid' || (ticket as any).payment_status === 'success';

            if (!isPaid) {
                playSound('error');
                setScanResult({
                    status: 'invalid',
                    message: 'Payment Required',
                    attendee: { name: ticket.attendee_name, email: ticket.attendee_email }
                });
                return;
            }

            // 4. Check Check-in Status
            if ((ticket as any).checked_in_at || ticket.is_validated) {
                const checkInTime = (ticket as any).checked_in_at || ticket.validated_at;
                playSound('warning');
                updateRecentScans(ticket, 'warning');
                setScanResult({
                    status: 'warning',
                    message: 'Already Checked In',
                    attendee: {
                        name: ticket.attendee_name,
                        email: ticket.attendee_email,
                        time: new Date(checkInTime).toLocaleTimeString()
                    }
                });
            } else {
                // Success - Check in
                const { data: updated, error: updateError } = await supabase
                    .from('tickets')
                    .update({
                        is_validated: true,
                        checked_in_at: new Date().toISOString(),
                        validated_at: new Date().toISOString()
                    } as any)
                    .eq('id', ticket.id)
                    .eq('is_validated', false)
                    .select()
                    .single();

                if (updateError || !updated) {
                    if (updateError) throw updateError;
                    // If no data returned, someone else validated it first
                    playSound('warning');
                    setScanResult({
                        status: 'warning',
                        message: 'Ticket already validated by another lens',
                        attendee: { name: ticket.attendee_name }
                    });
                    return;
                }

                playSound('success');
                updateRecentScans(ticket, 'valid');
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

            {/* Access Code Entrance */}
            {!accessible ? (
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm border-cyan-500/30 bg-gray-900 shadow-2xl">
                        <CardContent className="pt-8 space-y-6">
                            <div className="text-center space-y-2">
                                <Users className="w-12 h-12 mx-auto text-cyan-500 animate-pulse" />
                                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Staff Entry</h2>
                                <p className="text-xs text-muted-foreground italic">Powered by EventTix Pro Gate</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-white/70">Enter 6-Digit Gate Code</Label>
                                    <Input
                                        type="tel"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        placeholder="0 0 0 0 0 0"
                                        className="h-14 text-center text-2xl font-black tracking-[0.5em] bg-black/50 border-white/20 text-cyan-400 focus:border-cyan-500"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <Button
                                    className="w-full h-12 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 font-bold"
                                    onClick={handleVerifyAccess}
                                    disabled={verifying}
                                >
                                    {verifying ? "Verifying..." : "Access Scanner"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex flex-col justify-center items-center relative gap-4">
                        <div id="reader" className="w-full max-w-sm rounded-xl overflow-hidden border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] bg-gray-900 min-h-[300px]" />

                        <div className="w-full max-w-sm space-y-4">
                            {!scanning ? (
                                <Button onClick={startScanner} size="lg" className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 font-bold h-14 text-lg shadow-lg">
                                    <Camera className="w-5 h-5 mr-2" /> Start Entry Lens
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Button onClick={stopScanner} variant="destructive" size="lg" className="flex-1 font-bold h-12">
                                            Close Gate
                                        </Button>
                                        {hasTorch && (
                                            <Button
                                                onClick={toggleTorch}
                                                variant={isTorchOn ? "default" : "outline"}
                                                size="lg"
                                                className={`w-14 h-12 ${isTorchOn ? 'bg-yellow-500 text-black border-yellow-500' : 'text-white border-white/20'}`}
                                            >
                                                <Flashlight className={`w-5 h-5 ${isTorchOn ? 'fill-current' : ''}`} />
                                            </Button>
                                        )}
                                    </div>

                                    {availableCameras.length > 1 && (
                                        <div className="bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                                            <Label className="text-[10px] uppercase text-gray-400 mb-2 block tracking-widest font-bold font-mono">Lens Selector</Label>
                                            <select
                                                className="w-full bg-black/50 border-white/20 text-white rounded p-1 text-sm appearance-none outline-none focus:border-cyan-500 font-mono"
                                                value={cameraId || ''}
                                                onChange={(e) => handleCameraChange(e.target.value)}
                                            >
                                                {availableCameras.map(cam => (
                                                    <option key={cam.id} value={cam.id}>{cam.label || `Lens ${cam.id.slice(0, 5)}...`}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Recent Activity HUD */}
                        {recentScans.length > 0 && (
                            <div className="w-full max-w-sm mt-4 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em] mb-3 px-1 flex items-center justify-between">
                                    <span>Recent Entry Log</span>
                                    <span className="text-gray-500 font-mono">LIVE • {recentScans.length}</span>
                                </h3>
                                <div className="space-y-2">
                                    {recentScans.map((scan) => (
                                        <div key={scan.id} className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-md flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1 h-8 rounded-full ${scan.status === 'valid' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                    scan.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                                    }`} />
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-white truncate max-w-[150px]">{scan.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">{scan.tier}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-[10px] font-black tracking-widest ${scan.status === 'valid' ? 'text-green-500' :
                                                    scan.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                                                    }`}>
                                                    {scan.status.toUpperCase()}
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-mono">{scan.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Scan Result Overlay */}
                        {scanResult && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                                <Card className={`w-full max-w-sm border-2 ${scanResult.status === 'valid' ? 'border-green-500 bg-green-950/30' :
                                    scanResult.status === 'warning' ? 'border-amber-500 bg-amber-950/30' :
                                        'border-red-500 bg-red-950/30'
                                    } text-white shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
                                    <CardContent className="flex flex-col items-center p-8 text-center space-y-6">
                                        {scanResult.status === 'valid' && <CheckCircle className="w-24 h-24 text-green-500 animate-in zoom-in" />}
                                        {(scanResult.status === 'error' || scanResult.status === 'invalid') && <XCircle className="w-24 h-24 text-red-500 animate-in shake" />}
                                        {scanResult.status === 'warning' && <AlertTriangle className="w-24 h-24 text-amber-500 animate-in zoom-in" />}

                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black uppercase italic tracking-tighter">{scanResult.message}</h2>
                                            {scanResult.attendee && (
                                                <div className="text-sm opacity-90 mt-4 bg-black/40 p-3 rounded-lg border border-white/10">
                                                    <p className="font-bold text-xl text-cyan-400">{scanResult.attendee.name}</p>
                                                    <p className="text-gray-400 font-mono text-xs mb-2">{scanResult.attendee.email}</p>
                                                    {scanResult.attendee.time && (
                                                        <p className="inline-block px-2 py-1 bg-amber-500/20 text-amber-500 rounded text-[10px] font-bold">
                                                            ENTRY TIME: {scanResult.attendee.time}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    <p className="text-center text-[10px] text-gray-500 mt-6 font-mono tracking-[0.3em] uppercase">
                        {scannerStatus} • {isMobile ? "Mobile Engine" : "Desktop Engine"}
                    </p>
                </>
            )}
        </div>
    );
};

export default DoorStaffScanner;
