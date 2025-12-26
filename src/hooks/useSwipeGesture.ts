import { useEffect, useRef } from 'react';
import { hapticLight } from '../utils/haptics';

interface UseSwipeGestureOptions {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number;
    enableHaptic?: boolean;
}

export const useSwipeGesture = ({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    enableHaptic = true,
}: UseSwipeGestureOptions) => {
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchEndX = useRef(0);
    const touchEndY = useRef(0);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.changedTouches[0].screenX;
            touchStartY.current = e.changedTouches[0].screenY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            touchEndX.current = e.changedTouches[0].screenX;
            touchEndY.current = e.changedTouches[0].screenY;
            handleSwipe();
        };

        const handleSwipe = () => {
            const deltaX = touchEndX.current - touchStartX.current;
            const deltaY = touchEndY.current - touchStartY.current;

            // Determine if horizontal or vertical swipe
            const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

            if (isHorizontalSwipe) {
                // Horizontal swipe
                if (Math.abs(deltaX) > threshold) {
                    if (deltaX > 0) {
                        // Swipe right
                        if (onSwipeRight) {
                            if (enableHaptic) hapticLight();
                            onSwipeRight();
                        }
                    } else {
                        // Swipe left
                        if (onSwipeLeft) {
                            if (enableHaptic) hapticLight();
                            onSwipeLeft();
                        }
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(deltaY) > threshold) {
                    if (deltaY > 0) {
                        // Swipe down
                        if (onSwipeDown) {
                            if (enableHaptic) hapticLight();
                            onSwipeDown();
                        }
                    } else {
                        // Swipe up
                        if (onSwipeUp) {
                            if (enableHaptic) hapticLight();
                            onSwipeUp();
                        }
                    }
                }
            }
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, enableHaptic]);

    return null;
};
