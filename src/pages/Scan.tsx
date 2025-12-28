import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Camera, CheckCircle2, XCircle, BarChart3, AlertCircle, Upload, SwitchCamera, Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/components/AuthProvider';

const Scan = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState('');
  const { user } = useAuth();
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  // Offline Mode States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ticketCache, setTicketCache] = useState<Map<string, any>>(new Map());
  const [isCaching, setIsCaching] = useState(false);
  const [lastCacheUpdate, setLastCacheUpdate] = useState<Date | null>(null);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // Require authentication to access scanner
    if (!user) {
      toast.error('Please sign in to access the scanner');
      navigate('/auth');
      return;
    }

    // Monitor Online/Offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('System back online. Syncing...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline detected. Using secure local cache.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache load for performance
    loadTicketCache();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [user, navigate]);

  const loadTicketCache = async () => {
    if (!user) return;
    setIsCaching(true);

    try {
      // 1. Try to load from localStorage first for instant boot
      const savedCache = localStorage.getItem(`ticket_cache_${user.id}`);
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        setTicketCache(new Map(Object.entries(parsed)));
        setLastCacheUpdate(new Date(localStorage.getItem(`cache_time_${user.id}`) || Date.now()));
      }

      if (navigator.onLine) {
        // 2. Fetch fresh data from Supabase
        const { data, error } = await (supabase as any)
          .from('tickets')
          .select('*, events(*)')
          .eq('events.user_id', user.id);

        if (error) throw error;

        const newCache = new Map();
        data?.forEach((ticket: any) => {
          newCache.set(ticket.ticket_code, ticket);
        });

        setTicketCache(newCache);
        setLastCacheUpdate(new Date());

        // 3. Persist to localStorage
        localStorage.setItem(`ticket_cache_${user.id}`, JSON.stringify(Object.fromEntries(newCache)));
        localStorage.setItem(`cache_time_${user.id}`, new Date().toISOString());

        console.log(`✅ Cached ${newCache.size} tickets for offline use`);
      }
    } catch (err) {
      console.error('Caching error:', err);
    } finally {
      setIsCaching(false);
    }
  };

  const playSuccessSound = () => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playErrorSound = () => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  };

  const validateTicket = async (ticketCode: string) => {
    // Validate ticket code format
    const TICKET_CODE_PATTERN = /^[A-Z0-9]{8}-[A-Z0-9]{8}$/i;
    const MAX_LENGTH = 50;

    if (!ticketCode || ticketCode.length > MAX_LENGTH || !TICKET_CODE_PATTERN.test(ticketCode)) {
      playErrorSound();
      toast.error('Invalid ticket code format');
      setLastScan({ success: false, message: 'Invalid ticket format', code: ticketCode });
      return;
    }

    try {
      if (!user) {
        playErrorSound();
        toast.error('Authentication required');
        setLastScan({ success: false, message: 'Not signed in', code: ticketCode });
        return;
      }

      let ticketTyped: any = null;

      if (navigator.onLine) {
        // ONLINE VALIDATION (Primary)
        const { data: ticket, error } = await (supabase as any)
          .from('tickets')
          .select('*, events(*)')
          .eq('ticket_code', ticketCode)
          .maybeSingle();

        if (error) throw error;
        ticketTyped = ticket;
      } else {
        // OFFLINE VALIDATION (Secondary/Backup)
        ticketTyped = ticketCache.get(ticketCode);
        console.log('🔍 Offline validation attempt:', ticketCode, ticketTyped ? 'FOUND' : 'NOT FOUND');
      }

      if (!ticketTyped) {
        playErrorSound();
        toast.error('Invalid ticket code', {
          description: 'This ticket does not exist',
          duration: 3000,
        });
        setLastScan({ success: false, message: 'Invalid ticket', code: ticketCode });
        return;
      }

      // Authorization: ensure scanner owns the event
      const isOwner = ticketTyped?.events?.user_id === user.id;
      if (!isOwner) {
        playErrorSound();
        toast.error('Unauthorized', {
          description: 'You can only validate tickets for your own events.',
          duration: 3000,
        });
        setLastScan({ success: false, message: 'Unauthorized to validate this event', ticket: ticketTyped });
        return;
      }

      if (ticketTyped.is_validated) {
        playErrorSound();
        toast.error('Ticket already used', {
          description: `Validated on ${new Date(ticketTyped.validated_at).toLocaleString()}`,
          duration: 3000,
        });
        setLastScan({
          success: false,
          message: 'Already validated',
          ticket: ticketTyped,
          validatedAt: ticketTyped.validated_at
        });
        return;
      }

      // CHECK FOR EXPIRATION
      if (ticketTyped.payment_status === 'expired') {
        playErrorSound();
        toast.error('Ticket Expired', { description: 'Booking window (24h) has passed.' });
        setLastScan({
          success: false,
          message: 'Ticket Expired (Unpaid > 24h)',
          ticket: ticketTyped
        });
        return;
      }

      // CHECK PAYMENT STATUS
      if (ticketTyped.payment_status === 'pending' || ticketTyped.payment_status === 'pay_at_venue') {
        // Double Check Time on Client just in case it wasn't auto-expired yet
        const createdAt = new Date(ticketTyped.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (diffHours > 24) {
          playErrorSound();
          toast.error('Ticket Expired', { description: 'Booking window (24h) has passed.' });
          setLastScan({
            success: false,
            message: 'Ticket Expired (Unpaid > 24h)',
            ticket: ticketTyped
          });
          return;
        }

        playSuccessSound(); // Found it, but needs action
        toast.info('Payment Required', { description: 'Collect cash and confirm to validate.' });
        setLastScan({
          success: true,
          message: 'Payment Required',
          ticket: ticketTyped,
          requiresPayment: true
        });
        return;
      }

      // Atomic update with race condition prevention
      const { data: updated, error: updateError } = await (supabase as any)
        .from('tickets')
        .update({
          is_validated: true,
          validated_at: new Date().toISOString()
        })
        .eq('id', ticketTyped.id)
        .eq('is_validated', false) // Only update if not already validated
        .select()
        .single();

      if (updateError) throw updateError;

      // Check if update actually happened (race condition check)
      if (!updated) {
        playErrorSound();
        toast.error('Ticket already validated', {
          description: 'Another scanner validated this ticket first',
          duration: 3000,
        });
        setLastScan({
          success: false,
          message: 'Already validated by another scanner',
          ticket: ticketTyped
        });
        return;
      }

      playSuccessSound();
      toast.success('✅ Ticket Valid!', {
        description: `${ticketTyped.attendee_name} - ${ticketTyped.events.title}`,
        duration: 4000,
      });

      // Update state immediately for visual feedback
      setLastScan({
        success: true,
        message: navigator.onLine ? 'Valid ticket' : 'Valid (Offline Confirmed)',
        ticket: ticketTyped,
        validatedAt: new Date().toISOString(),
        offline: !navigator.onLine
      });

      // If offline, save this scan to sync later
      if (!navigator.onLine) {
        saveOfflineScan(ticketTyped.id);
      }

    } catch (error: any) {
      console.error('Ticket validation error', error);

      // FALLBACK: If network error during validation, try cache
      if (!navigator.onLine || error.message?.includes('Network')) {
        const fallbackTicket = ticketCache.get(ticketCode);
        if (fallbackTicket) {
          playSuccessSound();
          toast.warning('Network slow. Validated via Cache.');
          setLastScan({
            success: true,
            message: 'Valid (Network Fallback)',
            ticket: fallbackTicket,
            validatedAt: new Date().toISOString(),
            offline: true
          });
          saveOfflineScan(fallbackTicket.id);
          return;
        }
      }

      playErrorSound();
      toast.error('Validation failed');
      setLastScan({ success: false, message: 'Validation error', code: ticketCode });
    }
  };

  const saveOfflineScan = (ticketId: string) => {
    const offlineScans = JSON.parse(localStorage.getItem(`offline_scans_${user?.id}`) || '[]');
    if (!offlineScans.includes(ticketId)) {
      offlineScans.push({
        id: ticketId,
        validated_at: new Date().toISOString()
      });
      localStorage.setItem(`offline_scans_${user?.id}`, JSON.stringify(offlineScans));

      // Update local memory cache to reflect validation
      const updatedCache = new Map(ticketCache);
      const ticket = updatedCache.get(ticketId);
      if (ticket) {
        ticket.is_validated = true;
        ticket.validated_at = new Date().toISOString();
        setTicketCache(updatedCache);
      }
    }
  };

  const syncOfflineScans = async () => {
    if (!navigator.onLine || !user) return;

    const offlineScans = JSON.parse(localStorage.getItem(`offline_scans_${user.id}`) || '[]');
    if (offlineScans.length === 0) return;

    setIsCaching(true);
    let successCount = 0;

    try {
      for (const scan of offlineScans) {
        const { error } = await (supabase as any)
          .from('tickets')
          .update({
            is_validated: true,
            validated_at: scan.validated_at
          })
          .eq('id', scan.id)
          .eq('is_validated', false);

        if (!error) successCount++;
      }

      localStorage.setItem(`offline_scans_${user.id}`, '[]');
      if (successCount > 0) {
        toast.success(`Successfully synced ${successCount} offline scans!`);
      }
      loadTicketCache(); // Refresh cache after sync
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsCaching(false);
    }
  };

  const confirmPaymentAndValidate = async () => {
    if (!lastScan?.ticket?.id) return;

    try {
      const { error } = await (supabase as any)
        .from('tickets')
        .update({
          is_validated: true,
          validated_at: new Date().toISOString(),
          payment_status: 'paid',
          payment_ref_id: 'CASH_AT_VENUE'
        })
        .eq('id', lastScan.ticket.id);

      if (error) throw error;

      toast.success('Payment Confirmed & Ticket Validated!');
      playSuccessSound();

      setLastScan({
        ...lastScan,
        message: 'Valid ticket',
        requiresPayment: false,
        validatedAt: new Date().toISOString()
      });

      // Send Email Confirmation
      const ticket = lastScan.ticket;
      await fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ticket.attendee_email,
          ticketCode: ticket.ticket_code,
          eventTitle: ticket.events.title,
          eventDate: new Date(ticket.events.event_date).toLocaleDateString(),
          venue: ticket.events.venue,
          ticketId: ticket.id,
          attendeeName: ticket.attendee_name
        })
      });

    } catch (error: any) {
      console.error("Payment confirm error", error);
      toast.error("Failed to update ticket");
    }
  };

  const startScanning = async () => {
    try {
      setCameraError('');
      setIsScanning(true); // Show the container FIRST so the library can attach correctly

      // Small delay to ensure DOM is updated (removed hidden class)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if scanner is already running, stop if so
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Get available cameras and prefer back camera
      const cameras = await Html5Qrcode.getCameras();
      setAvailableCameras(cameras);

      let cameraConfig: any;

      if (selectedCameraId) {
        // Use user-selected camera
        cameraConfig = selectedCameraId;
      } else if (cameras && cameras.length > 0) {
        // Auto-select back camera
        const backCamera = cameras.find(cam =>
          cam.label.toLowerCase().includes('back') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
        );

        if (backCamera) {
          cameraConfig = backCamera.id;
          setSelectedCameraId(backCamera.id);
          console.log('✅ Using back camera:', backCamera.label);
        } else {
          // Fallback to last camera (usually back on mobile)
          cameraConfig = cameras[cameras.length - 1].id;
          setSelectedCameraId(cameras[cameras.length - 1].id);
          console.log('Using camera:', cameras[cameras.length - 1].label);
        }
      } else {
        // Fallback to facingMode if no cameras enumerated
        cameraConfig = { facingMode: 'environment' };
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 60, // Doubled for faster detection
          qrbox: { width: 400, height: 400 }, // Larger scan area for easier targeting
          aspectRatio: 1.0, // Square aspect ratio optimal for QR codes
          disableFlip: false,
          videoConstraints: {
            width: { ideal: 1920 }, // Higher resolution
            height: { ideal: 1080 },
            advanced: [
              { focusMode: "continuous" } as any,
              { exposureMode: "continuous" } as any, // Better in varying light
              { whiteBalanceMode: "continuous" } as any // Adapt to lighting
            ]
          },
          // @ts-ignore - experimentalFeatures not in type definition but supported
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Native scanner if available
          } as any // Type assertion for experimental features
        },
        (decodedText) => {
          console.log("✅ SCANNED:", decodedText);
          if (navigator.vibrate) navigator.vibrate(200); // Haptic feedback
          validateTicket(decodedText);
        },
        (errorMessage) => {
          if (errorMessage.includes("permission") || errorMessage.includes("NotAllowed")) {
            setCameraError("Camera access denied");
          }
        }
      );

    } catch (err: any) {
      console.error('Camera error:', err);
      setIsScanning(false); // Hide container on error

      let errorMessage = 'Unable to access camera.';
      if (err?.name === 'NotAllowedError' || err?.message?.includes('permission')) {
        errorMessage = 'Camera permission denied. Please enable it in browser settings.';
      } else if (err?.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      }

      setCameraError(errorMessage);
      toast.error('Camera Error', {
        description: errorMessage,
        duration: 5000
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) {
      toast.info('Only one camera available');
      return;
    }

    try {
      // Stop current scanner
      await stopScanning();

      // Find next camera
      const currentIndex = availableCameras.findIndex(cam => cam.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCamera = availableCameras[nextIndex];

      setSelectedCameraId(nextCamera.id);
      toast.success(`Switched to: ${nextCamera.label}`);

      // Small delay before restarting
      setTimeout(() => {
        startScanning();
      }, 500);

    } catch (err) {
      console.error('Camera switch error:', err);
      toast.error('Failed to switch camera');
    }
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (isScanning) {
        await stopScanning();
      }

      toast.info('📸 Scanning QR code...');

      const html5QrCode = new Html5Qrcode("qr-reader");
      const decodedText = await html5QrCode.scanFile(file, true);

      validateTicket(decodedText);

      // Reset input so same file can be selected again
      event.target.value = '';

    } catch (err) {
      console.error('File scan error', err);
      toast.error('Could not find QR Code in image', {
        description: 'Make sure the QR code is clearly visible and try again.'
      });
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Live Entry Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Sold</p>
              <p className="text-2xl font-black text-primary">{ticketCache.size}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Entered</p>
              <p className="text-2xl font-black text-green-500">
                {Array.from(ticketCache.values()).filter(t => t.is_validated).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Remaining</p>
              <p className="text-2xl font-black text-amber-500">
                {ticketCache.size - Array.from(ticketCache.values()).filter(t => t.is_validated).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Progress</p>
              <p className="text-2xl font-black text-blue-500">
                {ticketCache.size > 0
                  ? Math.round((Array.from(ticketCache.values()).filter(t => t.is_validated).length / ticketCache.size) * 100)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-primary/20 shadow-neon-cyan mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl text-gradient-cyber">QR Scanner</CardTitle>
                <CardDescription>Scan tickets to validate entry</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
                {lastCacheUpdate && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" />
                    Cache: {lastCacheUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Scanner Container */}
            <div className="relative">
              <div
                id="qr-reader"
                className={`w-full rounded-lg overflow-hidden ${isScanning ? 'block' : 'hidden'}`}
                style={{ minHeight: '400px', height: '400px', maxWidth: '100%' }}
              />

              {!isScanning && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Camera className="w-16 h-16 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    {cameraError || 'Ready to scan QR codes'}
                  </p>
                  {isIOS && !cameraError && (
                    <p className="text-xs text-yellow-500 text-center max-w-xs">
                      💡 Tip: Use the blue button below - camera opens instantly!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Scanner Controls */}
            <div className="flex gap-4">
              {!isScanning ? (
                <Button
                  variant="cyber"
                  size="lg"
                  className="w-full"
                  onClick={startScanning}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    onClick={stopScanning}
                  >
                    Stop Camera
                  </Button>
                  {availableCameras.length > 1 && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={switchCamera}
                      className="flex-shrink-0"
                      title="Switch Camera"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or upload image</span>
                </div>
              </div>

              <Button
                variant={isIOS ? "default" : "outline"}
                size="lg"
                className={isIOS ? "w-full bg-primary hover:bg-primary/90" : "w-full border-primary/20 hover:bg-primary/5"}
                onClick={() => document.getElementById('qr-file-input')?.click()}
              >
                <Upload className="w-5 h-5 mr-2" />
                {isIOS ? "📸 Scan QR Code (Instant)" : "Upload QR Image"}
              </Button>
              <Input
                id="qr-file-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Manual Entry Fallback */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-code" className="text-sm font-medium">
                  Manual Ticket Entry
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-code"
                    placeholder="XXXXXXXX-XXXXXXXX"
                    maxLength={17}
                    className="font-mono uppercase"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        if (input.value) {
                          validateTicket(input.value.toUpperCase());
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById('manual-code') as HTMLInputElement;
                      if (input?.value) {
                        validateTicket(input.value.toUpperCase());
                        input.value = '';
                      }
                    }}
                    variant="outline"
                  >
                    Validate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Use when QR code is damaged, wet, or unreadable
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Scan Result */}
        {lastScan && (
          <Card className={`border-2 ${lastScan.success ? (lastScan.requiresPayment ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-green-500/50 bg-green-500/5') : 'border-red-500/50 bg-red-500/5'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {lastScan.success ? (
                  lastScan.requiresPayment ? (
                    <AlertCircle className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                  )
                ) : (
                  <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${lastScan.success ? (lastScan.requiresPayment ? 'text-yellow-500' : 'text-green-500') : 'text-red-500'}`}>
                    {lastScan.message}
                  </h3>
                  {lastScan.ticket && (
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {lastScan.ticket.attendee_name}</p>
                      <p><strong>Email:</strong> {lastScan.ticket.attendee_email}</p>
                      <p><strong>Event:</strong> {lastScan.ticket.events.title}</p>
                      <p><strong>Code:</strong> {lastScan.ticket.ticket_code}</p>
                      {lastScan.ticket.ticket_tiers && (
                        <p><strong>Tier:</strong> {lastScan.ticket.ticket_tiers.name} - ₹{lastScan.ticket.ticket_tiers.price}</p>
                      )}
                      {lastScan.ticket.payment_status && (
                        <p className="uppercase"><strong>Payment:</strong> {lastScan.ticket.payment_status}</p>
                      )}
                      {lastScan.validatedAt && (
                        <p className="text-muted-foreground">
                          <strong>Validated:</strong> {new Date(lastScan.validatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {lastScan.code && !lastScan.ticket && (
                    <p className="text-sm text-muted-foreground">Code: {lastScan.code}</p>
                  )}

                  {lastScan.requiresPayment && (
                    <div className="mt-4">
                      <Button
                        onClick={confirmPaymentAndValidate}
                        disabled={!isOnline}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
                      >
                        {isOnline ? 'Collect Cash & Validate' : '⚠️ Connect to Sync Payment'}
                      </Button>
                      {!isOnline && (
                        <p className="text-[10px] text-center mt-2 text-amber-500">
                          Payment verification requires an active internet connection.
                        </p>
                      )}
                    </div>
                  )}

                  {lastScan.offline && (
                    <div className="mt-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                      <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                        Validated Offline - Will sync when online
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Button (Visible only when offline scans exist) */}
        {navigator.onLine && localStorage.getItem(`offline_scans_${user?.id}`) !== '[]' && localStorage.getItem(`offline_scans_${user?.id}`) !== null && (
          <Button
            variant="outline"
            className="w-full mt-4 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
            onClick={syncOfflineScans}
            disabled={isCaching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isCaching ? 'animate-spin' : ''}`} />
            Sync Offline Scans
          </Button>
        )}
      </div>
    </div >
  );
};

export default Scan;