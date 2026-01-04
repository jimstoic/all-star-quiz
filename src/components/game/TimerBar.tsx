'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface TimerBarProps {
    duration: number; // seconds
    startTime: number; // timestamp ms
    phase: 'COUNTDOWN' | 'ACTIVE' | 'LOCKED' | 'IDLE';
}

export function TimerBar({ duration, startTime, phase }: TimerBarProps) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (phase !== 'ACTIVE') {
            if (phase === 'LOCKED') setProgress(0);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const remaining = Math.max(0, duration - elapsed);
            const p = (remaining / duration) * 100;

            setProgress(p);

            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 50); // 20fps update

        return () => clearInterval(interval);
    }, [phase, startTime, duration]);

    const isLow = progress < 30;

    return (
        <div className="w-full h-6 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
            <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
                className={cn(
                    "h-full transition-colors duration-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]",
                    isLow ? "bg-red-500 shadow-red-500/50" : "bg-cyan-500 shadow-cyan-500/50"
                )}
            />
        </div>
    );
}
