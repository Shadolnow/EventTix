import { Scanner } from '@yudiel/react-qr-scanner';
import { useState } from 'react';

interface SimpleQRScannerProps {
    onScan: (result: string) => void;
    isScanning: boolean;
}

const SimpleQRScanner = ({ onScan, isScanning }: SimpleQRScannerProps) => {
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="relative w-full max-w-md mx-auto">
            {/* Scanner container */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary border-2 border-primary/30">
                {isScanning ? (
                    <>
                        <Scanner
                            onScan={(result) => {
                                if (result && result.length > 0) {
                                    // Vibrate on successful scan
                                    if (navigator.vibrate) {
                                        navigator.vibrate(200);
                                    }
                                    onScan(result[0].rawValue);
                                }
                            }}
                            onError={(err: Error | unknown) => {
                                const message = err instanceof Error ? err.message : 'Camera error';
                                console.error('Scanner error:', message);
                                setError(message);
                            }}
                            constraints={{
                                facingMode: 'environment'
                            }}
                            styles={{
                                container: {
                                    width: '100%',
                                    height: '100%',
                                },
                                video: {
                                    objectFit: 'cover',
                                },
                            }}
                        />
                        {/* Scanning frame overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Darkened edges */}
                            <div className="absolute inset-0 bg-black/50" />
                            {/* Clear center square */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-transparent border-0">
                                <div className="absolute inset-0 bg-transparent" style={{ boxShadow: '0 0 0 1000px rgba(0,0,0,0.5)' }} />
                            </div>
                        </div>
                        {/* Corner markers */}
                        <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                        <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />

                        {/* Scan line animation */}
                        <div className="absolute left-8 right-8 top-8 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p className="text-center font-mono">Scanner paused</p>
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <p className="mt-4 text-center text-destructive text-sm font-mono">
                    {error}
                </p>
            )}

            {/* Scanning indicator */}
            {isScanning && (
                <div className="mt-6 flex items-center justify-center gap-3">
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
    );
};

export default SimpleQRScanner;
