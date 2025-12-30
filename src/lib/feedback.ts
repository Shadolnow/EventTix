/**
 * Sound Effects & Haptic Feedback System
 * Delightful micro-interactions for premium UX
 */

class SoundManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private enabled: boolean = true;

    constructor() {
        // Load from localStorage
        const stored = localStorage.getItem('sound-effects-enabled');
        this.enabled = stored !== 'false'; // Default to enabled

        // Preload sounds
        this.loadSound('click', '/sounds/click.mp3');
        this.loadSound('success', '/sounds/success.mp3');
        this.loadSound('error', '/sounds/error.mp3');
        this.loadSound('payment', '/sounds/ching.mp3');
        this.loadSound('notification', '/sounds/notification.mp3');
    }

    private loadSound(name: string, path: string) {
        try {
            const audio = new Audio(path);
            audio.volume = 0.3; // Subtle volume
            this.sounds.set(name, audio);
        } catch (error) {
            console.warn(`Failed to load sound: ${name}`, error);
        }
    }

    play(soundName: string) {
        if (!this.enabled) return;

        const sound = this.sounds.get(soundName);
        if (sound) {
            // Clone and play to allow overlapping sounds
            const clone = sound.cloneNode() as HTMLAudioElement;
            clone.volume = sound.volume;
            clone.play().catch(err => console.warn('Sound play failed:', err));
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('sound-effects-enabled', String(this.enabled));
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }
}

class HapticManager {
    private enabled: boolean = true;

    constructor() {
        // Load from localStorage
        const stored = localStorage.getItem('haptic-enabled');
        this.enabled = stored !== 'false';

        // Check if vibration API is supported
        if (!('vibrate' in navigator)) {
            this.enabled = false;
        }
    }

    // Light tap (button press)
    light() {
        if (this.enabled && 'vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    // Medium impact (success/selection)
    medium() {
        if (this.enabled && 'vibrate' in navigator) {
            navigator.vibrate(25);
        }
    }

    // Heavy impact (error/important action)
    heavy() {
        if (this.enabled && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }

    // Success pattern
    success() {
        if (this.enabled && 'vibrate' in navigator) {
            navigator.vibrate([20, 50, 20]);
        }
    }

    // Error pattern
    error() {
        if (this.enabled && 'vibrate' in navigator) {
            navigator.vibrate([50, 30, 50, 30, 50]);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('haptic-enabled', String(this.enabled));
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }
}

// Singleton instances
export const soundManager = new SoundManager();
export const hapticManager = new HapticManager();

// Convenience functions
export const playSound = (name: string) => soundManager.play(name);
export const haptic = {
    light: () => hapticManager.light(),
    medium: () => hapticManager.medium(),
    heavy: () => hapticManager.heavy(),
    success: () => {
        hapticManager.success();
        soundManager.play('success');
    },
    error: () => {
        hapticManager.error();
        soundManager.play('error');
    },
    click: () => {
        hapticManager.light();
        soundManager.play('click');
    },
    payment: () => {
        hapticManager.medium();
        soundManager.play('payment');
    },
};

// React hook
export const useFeedback = () => {
    return {
        playSound,
        haptic,
        toggleSound: () => soundManager.toggle(),
        toggleHaptic: () => hapticManager.toggle(),
        soundEnabled: soundManager.isEnabled(),
        hapticEnabled: hapticManager.isEnabled(),
    };
};
