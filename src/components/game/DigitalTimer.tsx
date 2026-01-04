'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

export function DigitalTimer({ duration, startTime, phase }: { duration: number, startTime: number, phase: string }) {
    const [remaining, setRemaining] = useState(duration);

    useEffect(() => {
        if (phase !== 'ACTIVE') {
            if (phase === 'LOCKED') setRemaining(0);
            else setRemaining(duration);
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const rem = Math.max(0, duration - elapsed);
            setRemaining(rem);
            if (rem <= 0) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, [phase, startTime, duration]);

    const display = Math.ceil(remaining);
    const isCrictical = display <= 3;

    return (
        <div className={clsx(
            "font-mono font-black text-6xl tabular-nums leading-none",
            isCrictical ? "text-red-500 animate-pulse" : "text-white"
        )}>
            {display}
        </div>
    );
}
