import confetti from 'canvas-confetti';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Palette,
    Wine,
    Cocktail,
    GlassWater,
    Beer,
    Music,
    Sparkles,
    Users,
    PartyPopper,
    Zap,
    Star,
    Flame,
    Camera,
    Brush,
    Utensils,
    PlaySquare,
    Ticket
} from 'lucide-react';

// Party-themed background with animated elements
export const PartyBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15),rgba(6,182,212,0.1),transparent_70%)] animate-pulse-slow" />
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/80" />

            {/* Floating sophisticated elements */}
            <FloatingPartyElements />

            {/* Subtle mesh gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] animate-pulse-slow" />
        </div>
    );
};

// Party section header with animated title
export const PartyHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
    return (
        <div className="text-center mb-6 relative z-10">
            <h1 className="text-2xl md:text-5xl font-black mb-3 relative">
                <span className="absolute -inset-1 blur-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-50" />
                <span className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-transparent bg-clip-text animate-gradient-x">
                    {title}
                </span>
            </h1>
            {subtitle && (
                <p className="text-base md:text-xl text-muted-foreground font-medium">
                    {subtitle}
                </p>
            )}
            {/* Party Decoration */}
            <div className="flex justify-center items-center gap-4 mt-4">
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-primary drop-shadow-[0_0_8px_currentColor]"
                >
                    <Sparkles size={24} />
                </motion.div>
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <motion.div
                    animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="text-accent drop-shadow-[0_0_8px_currentColor]"
                >
                    <Star size={24} />
                </motion.div>
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    className="text-primary drop-shadow-[0_0_8px_currentColor]"
                >
                    <Sparkles size={24} />
                </motion.div>
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
        relative px-6 py-3 rounded-xl font-bold text-base md:text-lg
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

// Floating sophisticated party elements
export const FloatingPartyElements = () => {
    const assets = [
        { icon: Palette, color: 'text-pink-400', glow: 'shadow-pink-500/50' },
        { icon: Brush, color: 'text-blue-400', glow: 'shadow-blue-500/50' },
        { icon: Wine, color: 'text-red-400', glow: 'shadow-red-500/50' },
        { icon: Cocktail, color: 'text-orange-400', glow: 'shadow-orange-500/50' },
        { icon: GlassWater, color: 'text-sky-400', glow: 'shadow-sky-500/50' },
        { icon: Beer, color: 'text-yellow-400', glow: 'shadow-yellow-500/50' },
        { icon: Music, color: 'text-purple-400', glow: 'shadow-purple-500/50' },
        { icon: Sparkles, color: 'text-amber-400', glow: 'shadow-amber-500/50' },
        { icon: PartyPopper, color: 'text-emerald-400', glow: 'shadow-emerald-500/50' },
        { icon: Star, color: 'text-yellow-300', glow: 'shadow-yellow-400/50' },
        { icon: Camera, color: 'text-violet-400', glow: 'shadow-violet-500/50' },
        { icon: Utensils, color: 'text-rose-400', glow: 'shadow-rose-500/50' },
        { icon: Ticket, color: 'text-indigo-400', glow: 'shadow-indigo-500/50' },
    ];

    // Create a larger pool for better density in margins
    const elements = Array.from({ length: 40 }, (_, i) => {
        const side = i % 2 === 0 ? 'left' : 'right';
        const config = assets[Math.floor(Math.random() * assets.length)];
        // Wide range for gutters
        const xPos = side === 'left' ? Math.random() * 25 : 75 + Math.random() * 25;

        return {
            id: i,
            x: xPos,
            y: Math.random() * 100,
            Icon: config.icon,
            color: config.color,
            delay: Math.random() * 20,
            duration: 15 + Math.random() * 25,
            scale: 0.6 + Math.random() * 1.4,
            rotation: Math.random() * 360,
            drift: (Math.random() - 0.5) * 15 // Horizontal drift
        };
    });

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {elements.map((el) => (
                <motion.div
                    key={el.id}
                    className={`absolute ${el.color}`}
                    initial={{
                        x: `${el.x}%`,
                        y: `${el.y}%`,
                        rotate: el.rotation,
                        scale: 0,
                        opacity: 0
                    }}
                    animate={{
                        y: [`${el.y}%`, `${(el.y - 40 + 100) % 100}%`],
                        x: [`${el.x}%`, `${el.x + el.drift}%`, `${el.x}%`],
                        rotate: [el.rotation, el.rotation + 360],
                        scale: [el.scale * 0.9, el.scale * 1.1, el.scale * 0.9],
                        opacity: [0, 0.6, 0.6, 0]
                    }}
                    transition={{
                        duration: el.duration,
                        repeat: Infinity,
                        delay: el.delay,
                        ease: "linear"
                    }}
                >
                    <el.Icon
                        size={Math.random() > 0.8 ? 80 : 56}
                        strokeWidth={1.5}
                        className="drop-shadow-[0_0_15px_currentColor]"
                    />
                </motion.div>
            ))}

            {/* Dancing Silhouettes - Significantly more visible */}
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 opacity-[0.08] pointer-events-none overflow-hidden hidden lg:block">
                {[1, 2, 3, 4].map((_, i) => (
                    <motion.div
                        key={`sil-l-${i}`}
                        className="absolute bottom-[-40px] text-primary"
                        animate={{
                            y: [0, -30, 0],
                            rotate: [-3, 3, -3],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.5
                        }}
                        style={{ left: `${(i - 1) * 30}%` }}
                    >
                        <Users size={350} strokeWidth={0.5} />
                    </motion.div>
                ))}
            </div>

            <div className="absolute bottom-0 right-0 w-1/3 h-1/2 opacity-[0.08] pointer-events-none overflow-hidden hidden lg:block">
                {[1, 2, 3, 4].map((_, i) => (
                    <motion.div
                        key={`sil-r-${i}`}
                        className="absolute bottom-[-40px] text-accent"
                        animate={{
                            y: [0, -35, 0],
                            rotate: [3, -3, 3],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            duration: 3.5 + i,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.7
                        }}
                        style={{ right: `${(i - 1) * 30}%` }}
                    >
                        <Users size={350} strokeWidth={0.5} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
