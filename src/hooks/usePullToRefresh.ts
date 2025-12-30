import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Pull-to-Refresh Component
 * Enables native-like pull to refresh on mobile
 */
export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
    useEffect(() => {
        let touchStart = 0;
        let touchEnd = 0;
        let pullDistance = 0;
        const threshold = 80; // Pull distance required to trigger refresh

        const handleTouchStart = (e: TouchEvent) => {
            // Only trigger if at top of page
            if (window.scrollY <= 0) {
                touchStart = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (touchStart === 0) return;

            touchEnd = e.touches[0].clientY;
            pullDistance = touchEnd - touchStart;

            // Visual feedback
            if (pullDistance > 0 && pullDistance < threshold) {
                document.body.style.transform = `translateY(${pullDistance / 3}px)`;
                document.body.style.transition = 'transform 0.1s ease-out';
            }
        };

        const handleTouchEnd = async () => {
            if (pullDistance >= threshold) {
                toast.info('Refreshing...');
                try {
                    await onRefresh();
                    toast.success('Refreshed successfully!');
                } catch (error) {
                    toast.error('Failed to refresh');
                }
            }

            // Reset
            document.body.style.transform = '';
            document.body.style.transition = '';
            touchStart = 0;
            touchEnd = 0;
            pullDistance = 0;
        };

        // Only enable on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            document.addEventListener('touchstart', handleTouchStart, { passive: true });
            document.addEventListener('touchmove', handleTouchMove, { passive: true });
            document.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            if (isMobile) {
                document.removeEventListener('touchstart', handleTouchStart);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [onRefresh]);
};

// HOC for pages that need pull-to-refresh
export const withPullToRefresh = (Component: React.ComponentType, onRefresh: () => Promise<void>) => {
    return (props: any) => {
        usePullToRefresh(onRefresh);
        return <Component { ...props } />;
    };
};
