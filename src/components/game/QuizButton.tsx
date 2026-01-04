'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type ColorVariant = 'blue' | 'red' | 'green' | 'yellow';

interface QuizButtonProps {
    label: string;
    color: ColorVariant;
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
}

const VARIANTS = {
    blue: "bg-blue-600 border-blue-800 shadow-[0_6px_0_rgb(30,64,175)] hover:bg-blue-500",
    red: "bg-red-600 border-red-800 shadow-[0_6px_0_rgb(153,27,27)] hover:bg-red-500",
    green: "bg-green-600 border-green-800 shadow-[0_6px_0_rgb(22,101,52)] hover:bg-green-500",
    yellow: "bg-yellow-500 border-yellow-700 shadow-[0_6px_0_rgb(161,98,7)] hover:bg-yellow-400 text-yellow-950",
};

const PRESSED_STYLES = "active:shadow-none active:translate-y-[6px]";
const DISABLED_STYLES = "opacity-50 cursor-not-allowed grayscale shadow-none translate-y-[6px]";
const SELECTED_STYLES = "ring-4 ring-white ring-offset-4 ring-offset-slate-900 scale-[1.02]";

export function QuizButton({ label, color, selected, disabled, onClick, className }: QuizButtonProps) {
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
            {selected && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                    <Check className="w-5 h-5 text-black" strokeWidth={4} />
                </div>
            )}
            <span className="drop-shadow-md">{label}</span>
        </motion.button>
    );
}
