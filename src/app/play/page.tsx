'use client';

// ... (Imports)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameState, UserProfile } from '@/types/game';
import { QuizButton } from '@/components/game/QuizButton';
import { TimerBar } from '@/components/game/TimerBar';
import { SortableList } from '@/components/game/SortableList';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock, XCircle, Trophy } from 'lucide-react';

export default function PlayPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [gameState, setGameState] = useState<GameState>({ phase: 'IDLE', current_question_id: null, start_timestamp: 0 });
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

    // Eligibility State (Realtime)
    const [isEligible, setIsEligible] = useState(true);

    // Sync User & Eligibility
    useEffect(() => {
        const saved = localStorage.getItem('asq_user');
        if (!saved) { router.push('/'); return; }
        const parsed = JSON.parse(saved);
        setUser(parsed);

        // Initial check
        supabase.from('profiles').select('is_eligible').eq('id', parsed.id).single()
            .then(({ data }) => { if (data) setIsEligible(data.is_eligible ?? true); });

        // Realtime Profile Updates (Kick out)
        const channel = supabase.channel('profile_updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${parsed.id}` },
                (payload) => {
                    const newItem = payload.new as UserProfile;
                    setIsEligible(newItem.is_eligible);
                }
            ).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [router]);

    // Sync Game State (Standard)
    useEffect(() => {
        const channel = supabase.channel('game_room')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' },
                async (payload) => {
                    const newState = payload.new as GameState;
                    if (newState.current_question_id && newState.current_question_id !== gameState.current_question_id) {
                        const { data: q } = await supabase.from('questions').select('*').eq('id', newState.current_question_id).single();
                        if (q) newState.question = q;
                        setSelectedChoice(null); // Reset selection
                    } else {
                        newState.question = gameState.question;
                    }
                    setGameState(newState);
                }
            ).subscribe();
        // Initial fetch
        supabase.from('game_state').select('*').single().then(({ data }) => setGameState(old => ({ ...old, ...data })));
        return () => { supabase.removeChannel(channel); };
    }, [gameState.current_question_id, gameState.question]);

    const handleChoiceSubmit = async (choiceId: string) => {
        if (gameState.phase !== 'ACTIVE' || selectedChoice || !isEligible || !user) return;
        setSelectedChoice(choiceId);
        const now = Date.now();
        await supabase.from('answers').insert({
            user_id: user.id,
            question_id: gameState.current_question_id,
            answer_value: { choice: choiceId },
            client_timestamp: now,
            latency_diff: now - Number(gameState.start_timestamp)
        });
    };

    if (!user) return null;

    // Eliminated Screen
    if (!isEligible) {
        return (
            <div className="min-h-screen bg-red-950 text-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                <XCircle className="w-32 h-32 text-red-500 mb-8" />
                <h1 className="text-4xl font-black mb-4">ELIMINATED</h1>
                <p className="text-xl opacity-80">Please Sit Down</p>
                <p className="text-sm mt-8 opacity-50">Waiting for next period...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-white p-4 pb-20 safe-area-inset-bottom">
            <header className="flex justify-between items-center mb-6">
                <div className="text-sm font-bold text-slate-400">{user.display_name}</div>
                <div className="bg-slate-800 px-3 py-1 rounded-full text-xs text-cyan-400">{gameState.phase}</div>
            </header>

            <main className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full relative">
                <AnimatePresence mode="wait">

                    {/* Active/Locked Game Board */}
                    {['ACTIVE', 'LOCKED', 'DISTRIBUTION', 'REVEAL'].includes(gameState.phase) && gameState.question ? (
                        <motion.div className="space-y-4">
                            <TimerBar duration={gameState.question.time_limit} startTime={Number(gameState.start_timestamp)} phase={gameState.phase as any} />

                            {/* 4 Choice Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {gameState.question.options.map((opt, i) => (
                                    <QuizButton
                                        key={opt.id}
                                        label={opt.label}
                                        color={i === 0 ? 'blue' : i === 1 ? 'red' : i === 2 ? 'green' : 'yellow'}
                                        selected={selectedChoice === opt.id}
                                        disabled={gameState.phase !== 'ACTIVE'}
                                        onClick={() => handleChoiceSubmit(opt.id)}
                                    />
                                ))}
                            </div>

                            {/* Reveal Status */}
                            {gameState.phase === 'REVEAL' && (
                                <div className="text-center mt-4">
                                    {selectedChoice === gameState.question.correct_answer ? (
                                        <div className="text-green-400 text-2xl font-black animate-bounce">CORRECT!</div>
                                    ) : (
                                        <div className="text-red-500 text-2xl font-black">WRONG...</div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* Idle/Waiting Message */
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <Loader2 className="w-10 h-10 text-slate-500 animate-spin" />
                            </div>
                            <h2 className="text-2xl font-bold">Waiting...</h2>
                        </div>
                    )}

                </AnimatePresence>
            </main>
        </div>
    );
}
