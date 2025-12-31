/**
 * Celebration Effects for Ticket Bookings
 * Triggers confetti, sounds, and animations when tickets are successfully booked
 */

import confetti from 'canvas-confetti';

/**
 * Play clapping sound effect
 */
export const playClappingSound = () => {
    try {
        // Create an audio context for better browser support
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();

        // Generate clapping/applause sound using Web Audio API
        const duration = 2; // 2 seconds
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < buffer.length; i++) {
                // Create noise burst pattern for clapping effect
                const envelope = Math.exp(-i / (sampleRate * 0.1));
                const noise = (Math.random() * 2 - 1) * envelope;
                const clap = noise * Math.sin(i / 100); // Add some periodicity
                channelData[i] = clap * 0.3; // Reduce volume
            }
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();

        // Cleanup
        setTimeout(() => {
            audioContext.close();
        }, duration * 1000 + 100);
    } catch (error) {
        console.warn('Could not play clapping sound:', error);
    }
};

/**
 * Trigger premium confetti celebration
 */
export const triggerConfettiCelebration = () => {
    const duration = 3000; // 3 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Left side
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        });

        // Right side
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        });
    }, 250);
};

/**
 * Trigger emoji celebration (clapping hands, party popper, etc.)
 */
export const triggerEmojiCelebration = () => {
    const scalar = 3;
    const emojis = ['👏', '🎉', '🎊', '🥳', '✨', '🎈'];

    const defaults = {
        spread: 360,
        ticks: 100,
        gravity: 0.5,
        decay: 0.94,
        startVelocity: 30,
        shapes: emojis.map(emoji => confetti.shapeFromText({ text: emoji, scalar })),
        scalar,
        zIndex: 9999,
    };

    const shoot = () => {
        confetti({
            ...defaults,
            particleCount: 30,
        });

        confetti({
            ...defaults,
            particleCount: 20,
            flat: true,
        });

        confetti({
            ...defaults,
            particleCount: 15,
            scalar: scalar / 2,
            shapes: ['circle'],
        });
    };

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
};

/**
 * Full celebration package: confetti + claps + emojis
 */
export const celebrateTicketBooking = (options?: {
    showConfetti?: boolean;
    playSound?: boolean;
    showEmojis?: boolean;
}) => {
    const {
        showConfetti = true,
        playSound = true,
        showEmojis = true,
    } = options || {};

    // Play clapping sound
    if (playSound) {
        playClappingSound();
    }

    // Show confetti
    if (showConfetti) {
        triggerConfettiCelebration();
    }

    // Show emoji celebration
    if (showEmojis) {
        setTimeout(() => {
            triggerEmojiCelebration();
        }, 500);
    }
};

/**
 * Quick celebration for smaller actions (single ticket)
 */
export const celebrateTicketBookingQuick = () => {
    playClappingSound();

    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'],
        zIndex: 9999,
    });
};

/**
 * Big celebration for bulk bookings
 */
export const celebrateBulkBooking = (ticketCount: number) => {
    playClappingSound();

    // More intense confetti for bulk bookings
    const count = 200;
    const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
    };

    function fire(particleRatio: number, opts: any) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
        });
    }

    fire(0.25, {
        spread: 26,
        startVelocity: 55,
    });

    fire(0.2, {
        spread: 60,
    });

    fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
    });

    fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
    });

    fire(0.1, {
        spread: 120,
        startVelocity: 45,
    });

    // Add emoji celebration
    setTimeout(() => {
        triggerEmojiCelebration();
    }, 300);
};
