import React, { useMemo } from 'react';
import { useNeuralInterface } from '@/hooks/useNeuralInterface';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AgencyHero = () => {
    const neural = useNeuralInterface();

    // Complex calculation for dynamic styling based on "neural" state
    const dynamicStyle = useMemo(() => ({
        transform: `perspective(1000px) rotateX(${neural.cursor_velocity.y * 0.05}deg) rotateY(${neural.cursor_velocity.x * 0.05}deg)`,
        filter: `hue-rotate(${neural.scroll_pressure * 360}deg)`,
        transition: 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)'
    }), [neural]);

    return (
        <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black text-white">
            {/* Neural Grid Background */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at ${50 + neural.cursor_velocity.x}% ${50 + neural.cursor_velocity.y}%, #4f46e5 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    transform: `scale(${1 + neural.attention * 0.1})`
                }}
            />

            <div className="container relative z-10 px-4">
                <div className="max-w-5xl mx-auto text-center space-y-8" style={dynamicStyle}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl animate-fade-in">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium tracking-wider uppercase text-gray-300">
                            System Intelligence: {(neural.interaction_depth * 100).toFixed(2)}%
                        </span>
                    </div>

                    <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.9] mix-blend-difference">
                        <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-200 to-gray-600 animate-gradient-x">
                            DIGITAL
                        </span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                            REALITY
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                        We don't just sell tickets. We architect <span className="text-white font-semibold">experiences</span>.
                        Powered by advanced algorithmic validation and neural design patterns.
                    </p>

                    <div className="flex flex-col md:flex-row gap-6 justify-center items-center pt-12">
                        <Link to="/create-event">
                            <Button
                                size="xl"
                                className="h-16 px-12 text-lg bg-white text-black hover:bg-gray-200 rounded-none border-2 border-transparent hover:border-white transition-all duration-500"
                            >
                                INITIATE PROTOCOL <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link to="/events">
                            <Button
                                variant="outline"
                                size="xl"
                                className="h-16 px-12 text-lg border-white/20 hover:bg-white/10 text-white rounded-none backdrop-blur-md"
                            >
                                OBSERVE DATA <Sparkles className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Ambient Intelligence Indicators */}
            <div className="absolute bottom-10 left-10 flex gap-4 text-xs font-mono text-gray-600">
                <div>VEL: {neural.cursor_velocity.x.toFixed(2)}</div>
                <div>PRS: {neural.scroll_pressure.toFixed(2)}</div>
                <div>RES: {neural.viewport_resonance.toFixed(2)}</div>
            </div>
        </div>
    );
};
