import { useEffect, useRef, useState, useCallback } from 'react';
import { hapticMedium, hapticSuccess } from './haptics';

interface UsePullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number;
    resistance?: number;
}

export const usePullToRefresh = ({
    onRefresh,
    threshold = 80,
    resistance = 2.5,
}: UsePullToRefreshOptions) => {
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const currentY = useRef(0);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        hapticSuccess(); // Tactile feedback when refresh starts

        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
            setIsPulling(false);
            setPullDistance(0);
        }
    }, [onRefresh]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // Only trigger if at top of page
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startY.current === 0 || isRefreshing) return;

            currentY.current = e.touches[0].clientY;
            const distance = currentY.current - startY.current;

            // Only pull down (positive distance)
            if (distance > 0 && window.scrollY === 0) {
                // Apply resistance to make it feel natural
                const resistedDistance = distance / resistance;

                if (resistedDistance < threshold * 1.5) {
                    setPullDistance(resistedDistance);
                    setIsPulling(true);

                    // Haptic feedback at threshold
                    if (resistedDistance >= threshold && pullDistance < threshold) {
                        hapticMedium();
                    }
                }
            }
        };

        const handleTouchEnd = () => {
            if (pullDistance >= threshold && !isRefreshing) {
                handleRefresh();
            } else {
                setIsPulling(false);
                setPullDistance(0);
            }

            startY.current = 0;
            currentY.current = 0;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullDistance, threshold, resistance, isRefreshing, handleRefresh]);

    return {
        isPulling,
        pullDistance,
        isRefreshing,
        showIndicator: isPulling || isRefreshing,
    };
};
