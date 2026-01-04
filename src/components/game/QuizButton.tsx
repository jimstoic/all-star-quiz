'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type ColorVariant = 'blue' | 'red' | 'green' | 'yellow';

interface QuizButtonProps {
    label: string;
    index?: number; // 0-3
    color: ColorVariant;
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
}

// ... styles ...

export function QuizButton({ label, index, color, selected, disabled, onClick, className }: QuizButtonProps) {
    return (
        <motion.button
            whileTap={!disabled ? { scale: 0.95 } : undefined}
            onClick={!disabled ? onClick : undefined}
            className={cn(
                "relative w-full h-32 md:h-40 rounded-2xl text-2xl md:text-3xl font-black transition-all flex items-center justify-center p-4 border-b-4",
                VARIANTS[color],
                // Logic:
                // 1. If disabled AND NOT selected: Apply full DISABLED_STYLES (dimmed, no interaction).
                // 2. If disabled AND selected: Apply SELECTED_DISABLED_STYLES (keep color, no interaction, static pressed look).
                // 3. If NOT disabled: Apply PRESSED_STYLES (interactive).
                disabled && !selected ? DISABLED_STYLES : (disabled && selected ? SELECTED_DISABLED_STYLES : PRESSED_STYLES),
                selected && SELECTED_STYLES,
                className
            )}
        >
            {/* Number Badge */}
            <div className="absolute top-2 left-2 bg-black/20 text-white/50 text-xl font-mono w-8 h-8 rounded-full flex items-center justify-center">
                {index !== undefined ? index + 1 : ''}
            </div>

            {selected && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                    <Check className="w-5 h-5 text-black" strokeWidth={4} />
                </div>
            )}
            <span className="drop-shadow-md">{label}</span>
        </motion.button>
    );
}
