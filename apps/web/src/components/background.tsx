'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

const dataPoints = ['225 lbs', '405 lbs', '315 lbs', '5x5', '3x10', '1RM', 'RPE 7', 'RPE 8', 'RPE 9', '90%', '85%', '75%', 'PR', 'VOL', 'INT'];

export default function Background() {
    const [mounted, setMounted] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        setMounted(true);
    }, []);

    // OPTIMIZATION 1: useMemo ensures these don't regenerate on parent re-renders
    const floaters = useMemo(() => {
        return Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            text: dataPoints[Math.floor(Math.random() * dataPoints.length)],
            x: Math.random() * 100,
            y: Math.random() * 100,
            duration: 20 + Math.random() * 40,
            delay: Math.random() * -20,
            scale: 0.5 + Math.random() * 0.5,
            opacity: 0.1 + Math.random() * 0.2,
        }));
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 -z-50 bg-background overflow-hidden pointer-events-none">
            {/* Technical Grid Background */}
            <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                    backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px),
                                      linear-gradient(to bottom, #808080 1px, transparent 1px)`,
                    backgroundSize: '4rem 4rem',
                    // increased mask size slightly for better edge blending on large screens
                    maskImage: 'radial-gradient(ellipse 60% 60% at center, black 40%, transparent 100%)',
                }}
            />

            {/* Floating Data Points */}
            {!shouldReduceMotion &&
                floaters.map((item) => (
                    <motion.div
                        key={item.id}
                        className="absolute font-mono font-black text-primary select-none whitespace-nowrap"
                        initial={{
                            x: `${item.x}vw`,
                            y: `${item.y}vh`,
                            opacity: 0,
                        }}
                        animate={{
                            // OPTIMIZATION 2: varied movement range based on duration for more natural flow
                            y: [`${item.y}vh`, `${item.y - 30}vh`],
                            opacity: [0, item.opacity, 0],
                        }}
                        transition={{
                            duration: item.duration,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: item.delay,
                            ease: 'linear',
                        }}
                        style={{
                            fontSize: `${item.scale}rem`,
                        }}
                    >
                        {item.text}
                    </motion.div>
                ))}
        </div>
    );
}
