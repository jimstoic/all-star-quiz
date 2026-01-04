'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GamePhase, Question } from '@/types/game';
import { calculateResults, applyElimination, reviveAllPlayers } from '@/app/actions/game';
import { Loader2, Zap, ArrowRight, Skull, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASE_ORDER: GamePhase[] = ['IDLE', 'INTRO', 'ACTIVE', 'LOCKED', 'DISTRIBUTION', 'REVEAL', 'RANKING'];

export default function AdminPage() {
    const [currentPhase, setCurrentPhase] = useState<GamePhase>('IDLE');
    const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Initial Fetch
    const fetchData = () => {
        supabase.from('game_state').select('*').single().then(({ data }) => {
            if (data) {
                setCurrentPhase(data.phase as GamePhase);
                setCurrentQuestionId(data.current_question_id);
            }
        });
        supabase.from('questions').select('*').order('created_at', { ascending: true })
            .then(({ data }) => setQuestions((data as Question[]) || []));
    };

    useEffect(() => { fetchData(); }, []);

    // Game Control
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
        // ... (Same Logic as before)
        if (currentPhase === 'RANKING' && currentQuestionId) {
            if (confirm("Finish Ranking and ELIMINATE losers?")) {
                setLoading(true);
                const res = await applyElimination(currentQuestionId);
                setLastResult(`Eliminated: ${res?.eliminatedCount}`);
                setLoading(false);
                updateGameState('IDLE');
            }
            return;
        }
        let nextIdx = PHASE_ORDER.indexOf(currentPhase) + 1;
        if (nextIdx >= PHASE_ORDER.length) nextIdx = 0;
        const next = PHASE_ORDER[nextIdx];
        if (next === 'DISTRIBUTION' && currentQuestionId) {
            setLoading(true);
            const res = await calculateResults(currentQuestionId);
            setLastResult(`Correct: ${res.correctCount}`);
            setLoading(false);
        }
        updateGameState(next);
    };

    // Question Management
    const deleteQuestion = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this question?")) return;
        await supabase.from('questions').delete().eq('id', id);
        fetchData();
    };

    const CreateQuestionModal = () => {
        const [text, setText] = useState('');
        const [opts, setOpts] = useState(['', '', '', '']);
        const [correctIdx, setCorrectIdx] = useState(0);
        const [submitting, setSubmitting] = useState(false);

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setSubmitting(true);
            const options = opts.map((label, i) => ({
                id: `opt${i + 1}`,
                label: label || `Option ${i + 1}`,
                image_url: null
            }));
            const newVal = {
                type: 'choice4',
                text,
                time_limit: 10,
                options,
                correct_answer: `opt${correctIdx + 1}`
            };
            await supabase.from('questions').insert(newVal);
            setSubmitting(false);
            setShowCreateModal(false);
            fetchData();
        };

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 p-6 rounded-xl w-full max-w-lg space-y-4 shadow-2xl border border-gray-700">
                    <h3 className="text-xl font-bold flex justify-between">
                        Create Question
                        <button onClick={() => setShowCreateModal(false)}><X /></button>
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400">Question Text</label>
                            <input required className="w-full bg-gray-900 border border-gray-600 rounded p-2" value={text} onChange={e => setText(e.target.value)} placeholder="e.g. What is...?" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {opts.map((o, i) => (
                                <div key={i} className={`p-2 rounded border-l-4 ${i === correctIdx ? 'border-green-500 bg-gray-900' : 'border-gray-600 bg-gray-800'}`}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-500">Option {i + 1}</span>
                                        <input type="radio" name="correct" checked={i === correctIdx} onChange={() => setCorrectIdx(i)} />
                                    </div>
                                    <input required className="w-full bg-transparent border-b border-gray-700 focus:outline-none" value={o} onChange={e => {
                                        const newOpts = [...opts]; newOpts[i] = e.target.value; setOpts(newOpts);
                                    }} placeholder={`Answer ${i + 1}`} />
                                </div>
                            ))}
                        </div>
                        <button disabled={submitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold">
                            {submitting ? 'Saving...' : 'Create Question'}
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 font-sans flex flex-col gap-6">
            <header className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h1 className="text-xl font-bold text-blue-400">ADMIN AREA</h1>
                <div className="text-2xl font-mono text-yellow-500 font-bold">{currentPhase}</div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 max-w-7xl mx-auto w-full">

                {/* Control Panel */}
                <section className="bg-black/40 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center space-y-6">
                    <button
                        onClick={handleNextPhase}
                        disabled={loading}
                        className={`w-full max-w-sm aspect-video rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 duration-200 ${currentPhase === 'RANKING' ? 'bg-gradient-to-br from-red-700 to-red-900 border-red-500' : 'bg-gradient-to-br from-blue-600 to-indigo-800 border-blue-500'} border-4`}
                    >
                        {loading ? <Loader2 className="w-16 h-16 animate-spin" /> : (
                            <>
                                <span className="text-xl md:text-2xl font-black tracking-widest block mb-2 opacity-80">
                                    {currentPhase === 'RANKING' ? 'ELIMINATE' : 'NEXT PHASE'}
                                </span>
                                {currentPhase === 'RANKING' ? <Skull className="w-16 h-16 md:w-20 md:h-20" /> : <ArrowRight className="w-16 h-16 md:w-20 md:h-20" />}
                            </>
                        )}
                    </button>
                    <p className="text-gray-400 font-mono">{lastResult}</p>
                </section>

                {/* Library Panel */}
                <section className="bg-black/40 p-6 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-400 tracking-wider">LIBRARY</h2>
                        <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-500 p-2 rounded text-xs flex items-center gap-1">
                            <Plus className="w-4 h-4" /> Add New
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {questions?.length === 0 && <div className="text-center text-gray-500 py-10">No Questions</div>}
                        {questions?.map((q, i) => (
                            <div
                                key={q.id}
                                onClick={() => updateGameState('INTRO', q.id)}
                                className={`group relative w-full text-left p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-750 ${currentQuestionId === q.id ? 'bg-blue-900/40 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-800 border-gray-700'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs font-mono text-gray-500 mb-1">Q{i + 1} • {q.type}</div>
                                        <div className="font-medium pr-8">{q.text}</div>
                                    </div>
                                    {currentQuestionId === q.id && <div className="bg-blue-500 w-2 h-2 rounded-full animate-pulse" />}
                                </div>
                                <button onClick={(e) => deleteQuestion(q.id, e)} className="absolute top-2 right-2 p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <button onClick={() => reviveAllPlayers()} className="w-full bg-green-900/50 hover:bg-green-800 text-green-300 p-3 rounded flex items-center justify-center gap-2 border border-green-800">
                            <Zap className="w-4 h-4" /> REVIVE ALL PLAYERS
                        </button>
                    </div>
                </section>
            </main>

            {showCreateModal && <CreateQuestionModal />}
        </div>
    );
}
