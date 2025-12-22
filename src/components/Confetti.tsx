import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiProps {
    trigger?: boolean
    duration?: number
}

export const Confetti: React.FC<ConfettiProps> = ({ trigger = false, duration = 3000 }) => {
    useEffect(() => {
        if (!trigger) return

        const end = Date.now() + duration

        const colors = ['#00D9FF', '#FF0080', '#8B5CF6']

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            })
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            })

            if (Date.now() < end) {
                requestAnimationFrame(frame)
            }
        }

        frame()
    }, [trigger, duration])

    return null
}

// Utility function to fire confetti programmatically
export const fireConfetti = (options?: {
    particleCount?: number
    spread?: number
    duration?: number
}) => {
    const defaults = {
        particleCount: 150,
        spread: 70,
        duration: 2000,
        ...options
    }

    const colors = ['#00D9FF', '#FF0080', '#8B5CF6', '#F59E0B']

    const end = Date.now() + defaults.duration

    const frame = () => {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: defaults.spread,
            origin: { x: 0, y: 0.6 },
            colors: colors
        })
        confetti({
            particleCount: 2,
            angle: 120,
            spread: defaults.spread,
            origin: { x: 1, y: 0.6 },
            colors: colors
        })

        if (Date.now() < end) {
            requestAnimationFrame(frame)
        }
    }

    frame()
}
