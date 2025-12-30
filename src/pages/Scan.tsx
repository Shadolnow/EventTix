import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, CheckCircle2, XCircle, Wifi, WifiOff, RefreshCw, Database, Volume2, VolumeX, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth } from '@/components/AuthProvider';

const Scan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');

  // Offline / Cache State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ticketCache, setTicketCache] = useState<Map<string, any>>(new Map());
  const [isCaching, setIsCaching] = useState(false);
  const [lastCacheUpdate, setLastCacheUpdate] = useState<Date | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Preferences
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  // --- Audio / Voice Helpers ---
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    } catch (e) {
      console.error('Audio play error', e);
    }
  }, []);

  const playErrorSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    } catch (e) {
      console.error('Audio play error', e);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled]);

  // --- Effects ---
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success('Online'); };
    const handleOffline = () => { setIsOnline(false); toast.warning('Offline'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (user) loadTicketCache();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // --- Caching Logic ---
  const loadTicketCache = async () => {
    if (!user) return;
    setIsCaching(true);
    try {
      // Load local first
      const savedCache = localStorage.getItem(`ticket_cache_${user.id}`);
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        setTicketCache(new Map(Object.entries(parsed)));
        setLastCacheUpdate(new Date(localStorage.getItem(`cache_time_${user.id}`) || Date.now()));
      }

      // Fetch fresh if online
      if (navigator.onLine) {
        const { data, error } = await supabase
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

        localStorage.setItem(`ticket_cache_${user.id}`, JSON.stringify(Object.fromEntries(newCache)));
        localStorage.setItem(`cache_time_${user.id}`, new Date().toISOString());
      }
    } catch (e) {
      console.error('Cache error:', e);
    } finally {
      setIsCaching(false);
    }
  };

  // --- Ticket Validation ---
  const validateTicket = async (code: string) => {
    console.log('Validating:', code);

    // Check format
    if (!code || !/^[A-Z0-9]{8}-[A-Z0-9]{8}$/i.test(code)) {
      playErrorSound();
      toast.error('Invalid QR Format');
      return;
    }

    try {
      // Find ticket in cache or DB
      let ticket: any = null;

      if (ticketCache.has(code)) {
        ticket = ticketCache.get(code);
      } else if (navigator.onLine && user) {
        const { data } = await supabase
          .from('tickets')
          .select('*, events(*)')
          .eq('ticket_code', code)
          .maybeSingle();
        ticket = data;
      }

      if (!ticket) {
        playErrorSound();
        speak('Invalid Ticket');
        setLastScan({ status: 'invalid', message: 'Ticket not found', code });
        return;
      }

      // Check ownership
      if (user && ticket.events?.user_id !== user.id) {
        playErrorSound();
        speak('Wrong Event');
        setLastScan({ status: 'error', message: 'Different Event', code });
        toast.error('Ticket belongs to a different organizer');
        return;
      }

      // Check status
      if (ticket.is_validated || ticket.checked_in_at) {
        playErrorSound();
        speak('Already Used');
        setLastScan({ status: 'warning', message: 'Already Used', ticket });
        return;
      }

      // Validate
      if (navigator.onLine) {
        await supabase
          .from('tickets')
          .update({
            is_validated: true,
            checked_in_at: new Date().toISOString(),
            validated_at: new Date().toISOString()
          })
          .eq('id', ticket.id);
      }

      // Update local cache state immediately
      const updatedTicket = { ...ticket, is_validated: true, checked_in_at: new Date().toISOString() };
      setTicketCache(prev => {
        const next = new Map(prev);
        next.set(code, updatedTicket);
        return next;
      });

      playSuccessSound();
      speak('Valid Entry');
      setLastScan({ status: 'valid', message: 'Access Granted', ticket: updatedTicket });

      setRecentScans(prev => [updatedTicket, ...prev.slice(0, 4)]);

      // Pause scanning briefly? No, keep scanning but maybe delay next scan
      // For now we just let it continue

    } catch (err) {
      console.error('Validation error:', err);
      playErrorSound();
      toast.error('Validation Error');
    }
  };

  const handleScan = (result: any[]) => {
    if (result && result.length > 0) {
      const value = result[0].rawValue;
      if (value) {
        validateTicket(value);
        // Optional: Pause scanning to prevent double reads
        setIsScanning(false);
      }
    }
  };

  const resetScan = () => {
    setLastScan(null);
    setIsScanning(true);
  };

  // --- Render Helpers ---
  const getStatusColor = (status: string) => {
    if (status === 'valid') return 'text-green-500';
    if (status === 'warning') return 'text-amber-500';
    return 'text-red-500';
  };

  if (!user) return null; // Safe return

  return (
    <div className="min-h-screen p-4 pb-20 md:p-8">
      <div className="container mx-auto max-w-lg space-y-4">

        {/* Header / Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-secondary/50 border-none">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground font-bold">SOLD</div>
              <div className="text-xl font-black">{ticketCache.size}</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-none">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground font-bold">IN</div>
              <div className="text-xl font-black text-green-500">
                {Array.from(ticketCache.values()).filter(t => t.is_validated).length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-none">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground font-bold">LEFT</div>
              <div className="text-xl font-black text-amber-500">
                {ticketCache.size - Array.from(ticketCache.values()).filter(t => t.is_validated).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Scanner Card */}
        <Card className="overflow-hidden border-2 border-primary/20 shadow-neon-cyan">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Scanner</CardTitle>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 aspect-square relative bg-black">
            {lastScan ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-20 p-6 text-center animate-in fade-in">
                {lastScan.status === 'valid' ? (
                  <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
                ) : lastScan.status === 'warning' ? (
                  <CheckCircle2 className="w-20 h-20 text-amber-500 mb-4" />
                ) : (
                  <XCircle className="w-20 h-20 text-red-500 mb-4" />
                )}

                <h2 className={`text-2xl font-black mb-2 ${getStatusColor(lastScan.status)}`}>
                  {lastScan.message}
                </h2>

                {lastScan.ticket && (
                  <>
                    <p className="text-lg font-bold">{lastScan.ticket.attendee_name}</p>
                    <p className="text-sm text-muted-foreground">{lastScan.ticket.ticket_tiers?.name || 'General Admission'}</p>
                  </>
                )}

                <Button onClick={resetScan} size="lg" className="mt-8 w-full">
                  Scan Next
                </Button>
              </div>
            ) : isScanning ? (
              <div className="relative w-full h-full">
                <Scanner
                  onScan={handleScan}
                  onError={(err) => setCameraError(err?.message || 'Camera Error')}
                  constraints={{ facingMode }}
                  styles={{
                    container: { width: '100%', height: '100%' },
                    video: { objectFit: 'cover' }
                  }}
                  components={{ audio: false }} // We handle audio manually
                />

                {/* Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="scanner-frame absolute inset-0" />
                  <div className="absolute left-4 right-4 top-4 h-1 scan-line rounded-full" />
                </div>

                {/* Switch Camera Button */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-4 right-4 z-10 pointer-events-auto rounded-full w-12 h-12"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Camera className="w-16 h-16 text-muted-foreground" />
                <Button onClick={() => { setCameraError(null); setIsScanning(true); }} size="lg">
                  Open Camera
                </Button>
                {cameraError && <p className="text-red-500 text-sm">{cameraError}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardContent className="p-4 flex gap-2">
            <Input
              placeholder="Or type ticket code..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              className="font-mono uppercase"
            />
            <Button onClick={() => { validateTicket(manualCode); setManualCode(''); }}>Validate</Button>
          </CardContent>
        </Card>

        {/* Recent Scans (Simplified) */}
        {recentScans.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase">Recent</h3>
            {recentScans.map((scan) => (
              <div key={scan.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                <div className="text-sm font-medium">{scan.attendee_name}</div>
                <div className="text-xs text-green-500 font-bold">VALID</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Scan;