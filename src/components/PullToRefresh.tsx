import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { hapticMedium, hapticSuccess } from '@/utils/haptics';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    threshold?: number;
    disabled?: boolean;
}

export const PullToRefresh = ({
    onRefresh,
    children,
    threshold = 80,
    disabled = false
}: PullToRefreshProps) => {
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || refreshing) return;

        const scrollTop = containerRef.current?.scrollTop || 0;
        if (scrollTop > 0) return;

        startY.current = e.touches[0].clientY;
        setPulling(true);
    }, [disabled, refreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!pulling || disabled || refreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Apply resistance to pull
            const distance = Math.min(diff * 0.5, threshold * 1.5);
            setPullDistance(distance);

            // Haptic feedback when reaching threshold
            if (distance >= threshold && pullDistance < threshold) {
                hapticMedium();
            }
        }
    }, [pulling, disabled, refreshing, threshold, pullDistance]);

    const handleTouchEnd = useCallback(async () => {
        if (!pulling || disabled) return;

        if (pullDistance >= threshold) {
            setRefreshing(true);
            hapticSuccess();

            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }

        setPulling(false);
        setPullDistance(0);
    }, [pulling, pullDistance, threshold, onRefresh, disabled]);

    const progress = Math.min(pullDistance / threshold, 1);
    const rotation = progress * 360;

    return (
        <div
            ref={containerRef}
            className="relative overflow-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className={`absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-200 ${refreshing ? 'opacity-100' : pullDistance > 10 ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{
                    top: refreshing ? 20 : Math.max(pullDistance - 40, -40),
                    transform: `translateX(-50%) rotate(${rotation}deg)`
                }}
            >
                <div className={`w-10 h-10 rounded-full bg-primary/10 border-2 ${pullDistance >= threshold || refreshing ? 'border-primary' : 'border-primary/30'
                    } flex items-center justify-center backdrop-blur-sm`}>
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-primary' :
                            pullDistance >= threshold ? 'text-primary' : 'text-primary/50'
                        }`} />
                </div>
            </div>

            {/* Content with pull transform */}
            <div
                style={{
                    transform: `translateY(${refreshing ? 60 : pullDistance}px)`,
                    transition: pulling ? 'none' : 'transform 0.3s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
};

// Simple refresh hook
export const useRefresh = (fetchFn: () => Promise<void>) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await fetchFn();
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchFn]);

    return { isRefreshing, refresh };
};
