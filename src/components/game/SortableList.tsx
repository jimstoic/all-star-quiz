'use client';

import { Reorder } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { QuestionOption } from '@/types/game';

interface SortableListProps {
    options: QuestionOption[];
    onOrderChange: (ids: string[]) => void;
    disabled?: boolean;
}

export function SortableList({ options, onOrderChange, disabled }: SortableListProps) {
    const [items, setItems] = useState(options);

    useEffect(() => {
        onOrderChange(items.map(i => i.id));
    }, [items, onOrderChange]);

    return (
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3 w-full">
            {items.map((item) => (
                <Reorder.Item key={item.id} value={item} className="touch-none select-none">
                    <div className={cn(
                        "bg-slate-800 rounded-lg p-4 flex items-center gap-4 border border-slate-700 shadow-lg active:scale-105 transition-transform",
                        disabled && "opacity-60 grayscale pointer-events-none"
                    )}>
                        <div className="cursor-grab active:cursor-grabbing text-slate-500">
                            <GripVertical />
                        </div>
                        <div className="text-lg font-bold text-white flex-1">
                            {item.label}
                        </div>
                    </div>
                </Reorder.Item>
            ))}
        </Reorder.Group>
    );
}
