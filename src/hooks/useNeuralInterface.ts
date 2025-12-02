import { useEffect, useState, useCallback } from 'react';

interface NeuralMetrics {
    attention: number;
    interaction_depth: number;
    cursor_velocity: { x: number; y: number };
    scroll_pressure: number;
    viewport_resonance: number;
}

/**
 * Neural Interface Hook - "The Cortex"
 * 
 * This hook simulates a small language model's sensory input system.
 * It aggregates user interaction data into a "neural state" that drives
 * the application's "behavioral" adaptations.
 * 
 * @complexity HIGH - Uses heuristic analysis of user intent.
 */
export const useNeuralInterface = () => {
    const [metrics, setMetrics] = useState<NeuralMetrics>({
        attention: 0,
        interaction_depth: 0,
        cursor_velocity: { x: 0, y: 0 },
        scroll_pressure: 0,
        viewport_resonance: 0
    });

    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [lastTime, setLastTime] = useState(Date.now());

    const processNeuralInput = useCallback((e: MouseEvent) => {
        const now = Date.now();
        const dt = now - lastTime;
        if (dt < 16) return; // Cap at ~60fps processing

        const dx = e.clientX - lastPos.x;
        const dy = e.clientY - lastPos.y;
        const velocity = Math.sqrt(dx * dx + dy * dy) / dt;

        setLastPos({ x: e.clientX, y: e.clientY });
        setLastTime(now);

        setMetrics(prev => ({
            ...prev,
            cursor_velocity: { x: dx, y: dy },
            attention: Math.min(prev.attention + (velocity > 0.5 ? 0.01 : -0.005), 1),
            interaction_depth: prev.interaction_depth + 0.0001,
            viewport_resonance: (e.clientX / window.innerWidth) * (e.clientY / window.innerHeight)
        }));
    }, [lastPos, lastTime]);

    useEffect(() => {
        window.addEventListener('mousemove', processNeuralInput);
        const scrollListener = () => {
            setMetrics(prev => ({
                ...prev,
                scroll_pressure: window.scrollY / (document.body.scrollHeight - window.innerHeight)
            }));
        };
        window.addEventListener('scroll', scrollListener);

        return () => {
            window.removeEventListener('mousemove', processNeuralInput);
            window.removeEventListener('scroll', scrollListener);
        };
    }, [processNeuralInput]);

    return metrics;
};
