'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GamePhase, Question } from '@/types/game';
import { calculateResults, applyElimination, reviveAllPlayers, resetQuestionAnswers } from '@/app/actions/game';
import { Loader2, Zap, ArrowRight, Skull, Plus, Trash2, X, Upload, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASE_ORDER: GamePhase[] = ['IDLE', 'INTRO', 'ACTIVE', 'LOCKED', 'DISTRIBUTION', 'REVEAL', 'RANKING'];

export default function AdminPage() {
    const [currentPhase, setCurrentPhase] = useState<GamePhase>('IDLE');
    const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

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

    useEffect(() => {
        fetchData();
        const stateChannel = supabase.channel('admin_state')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' },
                (payload) => {
                    const newState = payload.new as any;
                    setCurrentPhase(newState.phase as GamePhase);
                    setCurrentQuestionId(newState.current_question_id);
                })
            .subscribe();

        const qChannel = supabase.channel('admin_questions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' },
                () => {
                    supabase.from('questions').select('*').order('created_at', { ascending: true })
                        .then(({ data }) => setQuestions((data as Question[]) || []));
                })
            .subscribe();

        return () => {
            supabase.removeChannel(stateChannel);
            supabase.removeChannel(qChannel);
        };
    }, []);

    // Game Control
    // Auto-Lock Effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (currentPhase === 'ACTIVE' && currentQuestionId) {
            // Find current question duration
            const q = questions.find(q => q.id === currentQuestionId);
            const duration = (q?.time_limit || 10) * 1000;

            // Lock 1s AFTER timer ends
            timer = setTimeout(() => {
                updateGameState('LOCKED');
            }, duration + 1000);
        }
        return () => clearTimeout(timer);
    }, [currentPhase, currentQuestionId, questions]);

    const updateGameState = async (phase: GamePhase, questionId?: string | null) => {
        setLoading(true);
        const updateData: any = { phase };

        // If starting a NEW question (INTRO), reset its previous answers
        if (questionId && phase === 'INTRO') {
            await resetQuestionAnswers(questionId);
        }

        if (questionId !== undefined) updateData.current_question_id = questionId;
        if (phase === 'ACTIVE') updateData.start_timestamp = Date.now();

        await supabase.from('game_state').update(updateData).eq('id', 1);
        setCurrentPhase(phase);
        setLoading(false);
    };

    const handleNextPhase = async () => {
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
    };

    const openEditModal = (q: Question, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingQuestion(q);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingQuestion(null);
        setShowModal(true);
    };



    // --- NEW: Player Management Logic (Presence) ---
    const [activeTab, setActiveTab] = useState<'QUESTIONS' | 'PLAYERS'>('QUESTIONS');
    const [players, setPlayers] = useState<any[]>([]); // DB Players (all)
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set()); // Presence IDs

    useEffect(() => {
        // 1. Fetch persistent profiles (for scores/eligibility)
        const fetchProfiles = () => supabase.from('profiles').select('*').order('score', { ascending: false }).then(({ data }) => setPlayers(data || []));
        fetchProfiles();

        const pChannel = supabase.channel('admin_players_db')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchProfiles)
            .subscribe();

        // 2. Presence (Online Status)
        const presenceChannel = supabase.channel('global_presence')
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const onlineIds = new Set(Object.keys(state));
                setOnlineUsers(onlineIds);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(pChannel);
            supabase.removeChannel(presenceChannel);
        };
    }, []);




    const QuestionModal = () => {
        // Mode logic
        const getInitMode = () => {
            if (!editingQuestion) return '4-TEXT';
            const count = editingQuestion.options.length;
            const hasImg = editingQuestion.options.some(o => !!o.image_url);
            if (count === 2) return hasImg ? '2-IMAGE' : '2-TEXT';
            return hasImg ? '4-IMAGE' : '4-TEXT';
        };

        const [qMode, setQMode] = useState<string>(getInitMode());
        const [text, setText] = useState(editingQuestion?.text || '');

        // Resize helper
        const resize = (arr: any[], size: number, fill: any) => {
            if (arr.length === size) return arr;
            if (arr.length > size) return arr.slice(0, size);
            return [...arr, ...Array(size - arr.length).fill(fill)];
        };

        const [opts, setOpts] = useState(() => {
            const base = editingQuestion ? editingQuestion.options.map(o => o.label) : [];
            const size = (getInitMode().startsWith('2')) ? 2 : 4;
            return resize(base, size, '');
        });

        const [optImgs, setOptImgs] = useState(() => {
            const base = editingQuestion ? editingQuestion.options.map(o => o.image_url || '') : [];
            const size = (getInitMode().startsWith('2')) ? 2 : 4;
            return resize(base, size, '');
        });

        const initCorrect = editingQuestion ? editingQuestion.options.findIndex(o => o.id === editingQuestion.correct_answer) : 0;
        const [correctIdx, setCorrectIdx] = useState(initCorrect === -1 ? 0 : initCorrect);
        const [submitting, setSubmitting] = useState(false);
        const [uploading, setUploading] = useState<number | null>(null);

        // Effect for Mode Switch
        useEffect(() => {
            const size = qMode.startsWith('2') ? 2 : 4;
            setOpts(prev => resize(prev, size, ''));
            setOptImgs(prev => resize(prev, size, ''));
            setCorrectIdx(prev => prev >= size ? 0 : prev);
        }, [qMode]);

        const handleFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            setUploading(index);

            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                // Upload to Supabase Storage "quiz_asset" bucket
                const { error: uploadError } = await supabase.storage
                    .from('quiz_asset')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('quiz_asset').getPublicUrl(filePath);

                const newImgs = [...optImgs];
                newImgs[index] = data.publicUrl;
                setOptImgs(newImgs);

            } catch (err: any) {
                console.error(err);
                alert(`Upload Failed: ${err.message}. Make sure 'quiz_assets' bucket exists and is Public.`);
            } finally {
                setUploading(null);
            }
        };

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setSubmitting(true);
            const isImgMode = qMode.includes('IMAGE');

            const options = opts.map((label, i) => ({
                id: `opt${i + 1}`,
                label: label || `Option ${i + 1}`,
                image_url: isImgMode && optImgs[i] ? optImgs[i] : null
            }));

            const newVal = {
                type: qMode.startsWith('2') ? 'choice2' : 'choice4',
                text,
                time_limit: 10,
                options,
                correct_answer: `opt${correctIdx + 1}`
            };

            try {
                if (editingQuestion) {
                    await supabase.from('questions').update(newVal).eq('id', editingQuestion.id);
                } else {
                    await supabase.from('questions').insert(newVal);
                }
                setShowModal(false);
            } catch (err) {
                alert('Save failed');
            }
            setSubmitting(false);
        };

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 p-6 rounded-xl w-full max-w-2xl space-y-4 shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">{editingQuestion ? 'Edit' : 'Create'} Question</h3>
                        <div className="flex bg-gray-900 rounded p-1 gap-1">
                            {['4-TEXT', '4-IMAGE', '2-TEXT', '2-IMAGE'].map(m => (
                                <button key={m} type="button" onClick={() => setQMode(m)} className={`px-3 py-1 text-xs rounded font-bold transition-all ${qMode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Question Text</label>
                            <input required className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-lg" value={text} onChange={e => setText(e.target.value)} placeholder="e.g. What is this?" />
                        </div>

                        <div className={`grid gap-4 ${qMode.startsWith('2') ? 'grid-cols-2' : 'grid-cols-2'}`}>
                            {opts.map((o, i) => (
                                <div key={i} className={`p-3 rounded border-l-4 ${i === correctIdx ? 'border-green-500 bg-gray-900' : 'border-gray-600 bg-gray-800'}`}>

                                    {/* Header: Radio + Label */}
                                    <div className="flex justify-between mb-2">
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCorrectIdx(i)}>
                                            <input type="radio" name="correct" checked={i === correctIdx} onChange={() => setCorrectIdx(i)} className="w-4 h-4 accent-green-500" />
                                            <span className={`text-xs font-bold ${i === correctIdx ? 'text-green-400' : 'text-gray-500'}`}>Option {i + 1}</span>
                                        </div>
                                    </div>

                                    {/* Text Input */}
                                    <input required className="w-full bg-transparent border-b border-gray-700 focus:outline-none mb-2 py-1" value={o} onChange={e => {
                                        const newOpts = [...opts]; newOpts[i] = e.target.value; setOpts(newOpts);
                                    }} placeholder={`Answer ${i + 1}`} />

                                    {/* Image Input */}
                                    {qMode.includes('IMAGE') && (
                                        <div className="mt-2 space-y-2">
                                            {/* Preview */}
                                            {optImgs[i] ? (
                                                <div className="relative group">
                                                    <img src={optImgs[i]} className="h-24 w-full object-cover rounded border border-gray-600" />
                                                    <button type="button" onClick={() => { const n = [...optImgs]; n[i] = ''; setOptImgs(n) }} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                                </div>
                                            ) : (
                                                <label className={`h-24 w-full bg-black/20 rounded border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-900/10 transition-colors ${uploading === i ? 'opacity-50' : ''}`}>
                                                    {uploading === i ? (
                                                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-gray-500 mb-1" />
                                                            <span className="text-[10px] text-gray-500">Upload Image</span>
                                                        </>
                                                    )}
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(i, e)} disabled={uploading !== null} />
                                                </label>
                                            )}

                                            {/* URL Fallback */}
                                            <div className="flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3 text-gray-600" />
                                                <input className="flex-1 text-[10px] bg-transparent border-none text-gray-500 focus:text-white focus:ring-0"
                                                    value={optImgs[i]}
                                                    onChange={e => { const newImgs = [...optImgs]; newImgs[i] = e.target.value; setOptImgs(newImgs); }}
                                                    placeholder="or paste URL..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button disabled={submitting || uploading !== null} type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 rounded-lg font-bold shadow-lg transition-all">
                            {submitting ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Create Question')}
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

                {/* Library/Player Panel */}
                <section className="bg-black/40 p-6 rounded-xl border border-gray-700 flex flex-col overflow-hidden">

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-gray-700 mb-4 pb-2">
                        <button onClick={() => setActiveTab('QUESTIONS')} className={`text-sm font-bold pb-2 transition-colors ${activeTab === 'QUESTIONS' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                            QUESTIONS ({questions.length})
                        </button>
                        <button onClick={() => setActiveTab('PLAYERS')} className={`text-sm font-bold pb-2 transition-colors ${activeTab === 'PLAYERS' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                            PLAYERS ({players.length})
                        </button>
                        {activeTab === 'QUESTIONS' && (
                            <button onClick={openCreateModal} className="ml-auto bg-blue-600 hover:bg-blue-500 py-1 px-3 rounded text-xs flex items-center gap-1">
                                <Plus className="w-3 h-3" /> New
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {activeTab === 'QUESTIONS' ? (
                            <>
                                {questions?.length === 0 && <div className="text-center text-gray-500 py-10">No Questions</div>}
                                {questions?.map((q, i) => {
                                    const hasImages = q.options.some((o: any) => !!o.image_url);
                                    return (
                                        <div
                                            key={q.id}
                                            onClick={() => updateGameState('INTRO', q.id)}
                                            className={`group relative w-full text-left p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-750 ${currentQuestionId === q.id ? 'bg-blue-900/40 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-800 border-gray-700'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 mr-8">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-mono text-gray-500">Q{i + 1}</span>
                                                        {hasImages && <span className="text-[10px] bg-pink-900 text-pink-200 px-1 rounded border border-pink-700">IMAGE</span>}
                                                    </div>
                                                    <div className="font-medium text-sm truncate">{q.text}</div>
                                                </div>
                                                {currentQuestionId === q.id && <div className="bg-blue-500 w-2 h-2 rounded-full animate-pulse mt-2" />}
                                            </div>
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => openEditModal(q, e)} className="p-1 px-2 text-xs text-gray-400 hover:text-blue-400 bg-gray-900/80 rounded hover:bg-gray-700">Edit</button>
                                                <button onClick={(e) => deleteQuestion(q.id, e)} className="p-1 px-2 text-xs text-gray-400 hover:text-red-500 bg-gray-900/80 rounded hover:bg-gray-700"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            /* PLAYERS LIST */
                            <>
                                {players.length === 0 && <div className="text-center text-gray-500 py-10">No Players Joined</div>}
                                {players.map((p) => (
                                    <div key={p.id} className={`flex justify-between items-center p-3 rounded border ${p.is_eligible ? 'bg-gray-800 border-gray-700' : 'bg-red-900/20 border-red-900 opacity-60'}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${onlineUsers.has(p.id) ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-gray-600'}`} />
                                                <div className="font-bold text-sm text-gray-200">{p.display_name}</div>
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono ml-4">{p.id.split('-')[0]}...</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-mono font-bold text-blue-400">{p.score}</div>
                                            {!p.is_eligible && <div className="text-[10px] text-red-500 font-bold">ELIMINATED</div>}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                        <button onClick={() => reviveAllPlayers().then(r => r?.success ? alert('Revived!') : alert('Error'))} className="w-full bg-green-900/50 hover:bg-green-800 text-green-300 p-3 rounded flex items-center justify-center gap-2 border border-green-800 transition-colors">
                            <Zap className="w-4 h-4" /> REVIVE ALL PLAYERS
                        </button>

                        <button onClick={async () => {
                            if (!confirm("Are you sure? This will kick everyone out.")) return;
                            setLoading(true);
                            // 1. Clear Answers (FK Constraint)
                            await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                            // 2. Delete Profiles
                            await supabase.from('profiles').delete().neq('id', '0000-0000');
                            // 3. Reset Game State
                            await supabase.from('game_state').update({ phase: 'IDLE', current_question_id: null }).eq('id', 1);

                            setPlayers([]);
                            setLoading(false);
                        }} className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 p-3 rounded flex items-center justify-center gap-2 border border-red-900/50 transition-colors">
                            <Trash2 className="w-4 h-4" /> RESET / KICK ALL
                        </button>
                    </div>
                </section>
            </main>

            {showModal && <QuestionModal />}
        </div>
    );
}
