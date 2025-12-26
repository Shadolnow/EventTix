// Centralized Animation Utilities for EventTix
// Provides consistent, reusable animations across the entire app

/**
 * Page Transition Animations
 * Use these for route changes and component mounting
 */
export const pageTransitions = {
    fadeIn: 'animate-in fade-in duration-300',
    fadeOut: 'animate-out fade-out duration-200',
    slideInFromRight: 'animate-in slide-in-from-right duration-300',
    slideInFromLeft: 'animate-in slide-in-from-left duration-300',
    slideInFromBottom: 'animate-in slide-in-from-bottom duration-300',
    slideInFromTop: 'animate-in slide-in-from-top duration-200',
    scaleIn: 'animate-in zoom-in duration-200',
    scaleOut: 'animate-out zoom-out duration-150',
} as const;

/**
 * State Animations
 * Use these for success/error/loading states
 */
export const stateAnimations = {
    success: 'animate-bounce',
    error: 'animate-shake',
    pulse: 'animate-pulse',
    spin: 'animate-spin',
    ping: 'animate-ping',
} as const;

/**
 * Hover Effects
 * Use these for interactive elements
 */
export const hoverEffects = {
    lift: 'transition-transform hover:-translate-y-1 active:translate-y-0',
    liftLarge: 'transition-transform hover:-translate-y-2 active:translate-y-0',
    scale: 'transition-transform hover:scale-105 active:scale-100',
    scaleSmall: 'transition-transform hover:scale-102 active:scale-100',
    glow: 'transition-shadow hover:shadow-glow',
    glowPrimary: 'transition-shadow hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]',
    glowSuccess: 'transition-shadow hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]',
    rotate: 'transition-transform hover:rotate-3',
    brightness: 'transition-all hover:brightness-110',
} as const;

/**
 * Combined Effects
 * Pre-made combinations for common use cases
 */
export const combinedEffects = {
    card: 'transition-all hover:-translate-y-1 hover:shadow-lg',
    cardPremium: 'transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20',
    button: 'transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
    buttonPrimary: 'transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0',
    image: 'transition-transform hover:scale-105',
    link: 'transition-colors hover:text-primary',
} as const;

/**
 * Loading Animations
 * Use these for loading states and skeletons
 */
export const loadingAnimations = {
    shimmer: 'animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    spin: 'animate-spin',
} as const;

/**
 * Utility function to combine animation classes
 */
export const combineAnimations = (...classes: string[]): string => {
    return classes.filter(Boolean).join(' ');
};

/**
 * Get animation delay utility
 * Returns a style object with animation delay
 */
export const getAnimationDelay = (delayMs: number) => ({
    animationDelay: `${delayMs}ms`,
});

/**
 * Stagger animation delays for lists
 * Use with .map((item, index) => getStaggerDelay(index))
 */
export const getStaggerDelay = (index: number, baseDelayMs: number = 50) => ({
    animationDelay: `${index * baseDelayMs}ms`,
});

// Export all animations as a single object
export const animations = {
    ...pageTransitions,
    ...stateAnimations,
    ...hoverEffects,
    ...combinedEffects,
    ...loadingAnimations,
} as const;

// Type for all available animation keys
export type AnimationKey = keyof typeof animations;
