// Haptic Feedback Utility for Mobile-First Experience
import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticOptions {
    pattern?: HapticPattern;
}

// Check if device supports haptic feedback
export const supportsHaptics = (): boolean => {
    return 'vibrate' in navigator;
};

// Vibration patterns for different feedback types
const vibrationPatterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [10, 50, 10, 50, 30],
    warning: [30, 50, 30],
    error: [50, 30, 50, 30, 100],
    selection: 5
};

// Trigger haptic feedback
export const haptic = (options: HapticOptions = {}): void => {
    const { pattern = 'light' } = options;

    if (!supportsHaptics()) return;

    try {
        const vibrationPattern = vibrationPatterns[pattern];
        navigator.vibrate(vibrationPattern);
    } catch (error) {
        // Silently fail if vibration not supported
        console.debug('Haptic feedback not available');
    }
};

// Shorthand functions for common haptics
export const hapticLight = () => haptic({ pattern: 'light' });
export const hapticMedium = () => haptic({ pattern: 'medium' });
export const hapticHeavy = () => haptic({ pattern: 'heavy' });
export const hapticSuccess = () => haptic({ pattern: 'success' });
export const hapticWarning = () => haptic({ pattern: 'warning' });
export const hapticError = () => haptic({ pattern: 'error' });
export const hapticSelection = () => haptic({ pattern: 'selection' });

// React hook for haptic feedback
export const useHaptic = () => {
    const trigger = useCallback((pattern: HapticPattern = 'light') => {
        haptic({ pattern });
    }, []);

    return {
        trigger,
        light: useCallback(() => hapticLight(), []),
        medium: useCallback(() => hapticMedium(), []),
        heavy: useCallback(() => hapticHeavy(), []),
        success: useCallback(() => hapticSuccess(), []),
        warning: useCallback(() => hapticWarning(), []),
        error: useCallback(() => hapticError(), []),
        selection: useCallback(() => hapticSelection(), []),
        supported: supportsHaptics()
    };
};
