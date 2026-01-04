'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GamePhase, Question } from '@/types/game';
import { calculateResults, applyElimination, reviveAllPlayers } from '@/app/actions/game';
import { Loader2, Zap, ArrowRight, Skull } from 'lucide-react';

const PHASE_ORDER: GamePhase[] = [
    'IDLE',
    'INTRO',
    'ACTIVE',
    'LOCKED',
    'DISTRIBUTION',
    'REVEAL',
    'RANKING'
];

export default function AdminPage() {
    const [currentPhase, setCurrentPhase] = useState<GamePhase>('IDLE');
    const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<string>('');

    useEffect(() => {
        supabase.from('game_state').select('*').single().then(({ data }) => {
            if (data) {
                setCurrentPhase(data.phase as GamePhase);
                setCurrentQuestionId(data.current_question_id);
            }
        });
        supabase.from('questions').select('*').order('created_at', { ascending: true }).then(({ data }) => setQuestions(data as Question[]));
    }, []);

    const updateGameState = async (phase: GamePhase, questionId?: string | null) => {
        setLoading(true);
        const updateData: any = { phase };
        if (questionId !== undefined) updateData.current_question_id = questionId;
        if (phase === 'ACTIVE') updateData.start_timestamp = Date.now();
        await supabase.from('game_state').update(updateData).eq('id', 1);
        setCurrentPhase(phase);
        setLoading(false);
    };

    const handleNextPhase = async () => {
        // Current Logic
        if (currentPhase === 'RANKING' && currentQuestionId) {
            // Finishing Ranking -> Eliminate!
            if (confirm("Finish Ranking and ELIMINATE losers?")) {
                setLoading(true);
                const res = await applyElimination(currentQuestionId);
                setLastResult(`Eliminated: ${res?.eliminatedCount}`);
                setLoading(false);
                // Don't auto-advance to next question, just go to IDLE or stay in RANKING?
                // Usually we want to go Next Question INTRO? 
                // Let's just go to IDLE to be safe, or if next question selected manually.
                updateGameState('IDLE');
            }
            return;
        }

        let nextIdx = PHASE_ORDER.indexOf(currentPhase) + 1;
        if (nextIdx >= PHASE_ORDER.length) nextIdx = 0;
        const next = PHASE_ORDER[nextIdx];

        // Scoring Trigger
        if (next === 'DISTRIBUTION' && currentQuestionId) {
            setLoading(true);
            const res = await calculateResults(currentQuestionId);
            setLastResult(`Correct: ${res.correctCount}`);
            setLoading(false);
        }

        updateGameState(next);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 font-sans flex flex-col gap-6">
            <header className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h1 className="text-xl font-bold text-blue-400">ADMIN</h1>
                <div className="text-2xl font-mono text-yellow-500 font-bold">{currentPhase}</div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                <div className="bg-black/50 p-6 rounded-xl border border-gray-700 flex flex-col justify-center items-center space-y-6">
                    <button
                        onClick={handleNextPhase}
                        disabled={loading}
                        className={`w-full max-w-sm aspect-video rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 ${currentPhase === 'RANKING' ? 'bg-red-800' : 'bg-blue-700'}`}
                    >
                        {loading ? <Loader2 className="w-16 h-16 animate-spin" /> : (
                            <>
                                <span className="text-xl font-bold block mb-2 opacity-80">
                                    {currentPhase === 'RANKING' ? 'ELIMINATE & FINISH' : 'NEXT PHASE'}
                                </span>
                                {currentPhase === 'RANKING' ? <Skull className="w-16 h-16" /> : <ArrowRight className="w-16 h-16" />}
                            </>
                        )}
                    </button>
                    <div className="text-gray-400">{lastResult}</div>
                </div>

                <div className="bg-black/50 p-6 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
                    <div className="mb-4">
                        <button onClick={() => reviveAllPlayers()} className="w-full bg-green-800 text-green-100 p-3 rounded flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" /> REVIVE ALL (New Period)
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {questions.map((q, i) => (
                            <button
                                key={q.id}
                                onClick={() => updateGameState('INTRO', q.id)}
                                className={`w-full text-left p-3 rounded border ${currentQuestionId === q.id ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-700'}`}
                            >
                                Q{i + 1}: {q.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
