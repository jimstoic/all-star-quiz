'use client';

import { useEffect, useRef, useState } from 'react';
import { GamePhase } from '@/types/game';

type SoundKey = 'intro' | 'read' | 'countdown' | 'start' | 'thinking' | 'timeup' | 'correct' | 'ranking';

const SOUND_FILES: Record<SoundKey, string> = {
    intro: '/sounds/intro.mp3',
    read: '/sounds/read_question.mp3',
    countdown: '/sounds/countdown.mp3',
    start: '/sounds/start.mp3',
    thinking: '/sounds/thinking.mp3',
    timeup: '/sounds/timeup.mp3',
    correct: '/sounds/correct.mp3',
    ranking: '/sounds/ranking.mp3',
};

export function useGameAudio(currentPhase: GamePhase) {
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
    const [isReady, setIsReady] = useState(false); // User interaction check
    const prevPhase = useRef<GamePhase>('IDLE');

    // Initialize Audio Objects
    useEffect(() => {
        Object.entries(SOUND_FILES).forEach(([key, src]) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audioRefs.current[key] = audio;
        });
    }, []);

    const play = (key: SoundKey) => {
        if (!isReady) return;
        const audio = audioRefs.current[key];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log("Audio play failed (interaction required?)", e));
        }
    };

    const stop = (key: SoundKey) => {
        const audio = audioRefs.current[key];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    };

    // Phase Transition Logic
    useEffect(() => {
        const prev = prevPhase.current;
        if (prev === currentPhase) return;

        // Stop persistent sounds
        stop('thinking');

        // Trigger Logic
        switch (currentPhase) {
            case 'INTRO':
                play('intro');
                break;
            case 'READING':
                play('read');
                break;
            case 'COUNTDOWN':
                play('countdown');
                break;
            case 'ACTIVE':
                play('start');
                play('thinking');
                break;
            case 'LOCKED':
                play('timeup');
                break;
            case 'REVEAL':
                play('correct');
                break;
            case 'RANKING':
                play('ranking');
                break;
        }

        prevPhase.current = currentPhase;
    }, [currentPhase, isReady]);

    return {
        isReady,
        enableAudio: () => setIsReady(true),
    };
}
