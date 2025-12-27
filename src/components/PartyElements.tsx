import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

// Party-themed background with animated elements
export const PartyBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-orange-900/20 animate-gradient-shift" />

            {/* Floating party emojis */}
            <div className="absolute inset-0">
                {['🎉', '🎊', '🎈', '✨', '🎆', '🌟', '💫', '🎇'].map((emoji, i) => (
                    <div
                        key={i}
                        className="absolute text-4xl md:text-6xl opacity-20 animate-float"
                        style={{
                            left: `${(i * 12.5) + 5}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${5 + Math.random() * 3}s`
                        }}
                    >
                        {emoji}
                    </div>
                ))}
            </div>

            {/* Sparkles */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.1),transparent_50%)] animate-pulse" />
        </div>
    );
};

// Party section header with animated title
export const PartyHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
    return (
        <div className="text-center mb-8 relative z-10">
            <h1 className="text-5xl md:text-7xl font-black mb-4 relative">
                <span className="absolute -inset-1 blur-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-50" />
                <span className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-transparent bg-clip-text animate-gradient-x">
                    {title}
                </span>
            </h1>
            {subtitle && (
                <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                    {subtitle}
                </p>
            )}
            {/* Party poppers */}
            <div className="flex justify-center gap-4 mt-4 text-3xl md:text-4xl animate-bounce">
                🎊 🎉 🎊
            </div>
        </div>
    );
};

// Animated party button
export const PartyButton = ({
    children,
    onClick,
    variant = 'default',
    className = '',
    disabled = false
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'default' | 'secondary';
    className?: string;
    disabled?: boolean;
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        relative px-8 py-4 rounded-xl font-bold text-lg md:text-xl
        transform transition-all duration-200
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${variant === 'default'
                    ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/50'
                    : 'bg-white/10 text-white border-2 border-white/30 backdrop-blur-sm hover:bg-white/20'
                }
        ${className}
      `}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
            {variant === 'default' && !disabled && (
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 rounded-xl blur-lg opacity-50 animate-pulse" />
            )}
        </button>
    );
};

// Trigger confetti celebration
export const usePartyConfetti = () => {
    const celebrate = (options?: { duration?: number; spread?: number }) => {
        const duration = options?.duration || 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: options?.spread || 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    };

    return { celebrate };
};

// Party-themed card
export const PartyCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={`
      relative rounded-2xl overflow-hidden
      bg-gradient-to-br from-white/10 to-white/5
      backdrop-blur-xl border-2 border-white/20
      shadow-xl hover:shadow-2xl
      transform transition-all duration-300
      hover:scale-[1.02]
      ${className}
    `}>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-cyan-500/10" />
            <div className="relative z-10 p-6">
                {children}
            </div>
        </div>
    );
};

// Floating party elements animation
export const FloatingPartyElements = () => {
    const [elements, setElements] = useState<{ id: number; x: number; y: number; emoji: string; delay: number }[]>([]);

    useEffect(() => {
        const emojis = ['🎈', '🎊', '✨', '🎉', '💫', '🌟', '🎆', '🎇'];
        const newElements = Array.from({ length: 15 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            delay: Math.random() * 5
        }));
        setElements(newElements);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {elements.map((el) => (
                <div
                    key={el.id}
                    className="absolute text-2xl md:text-4xl opacity-30 animate-float-slow"
                    style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        animationDelay: `${el.delay}s`
                    }}
                >
                    {el.emoji}
                </div>
            ))}
        </div>
    );
};
