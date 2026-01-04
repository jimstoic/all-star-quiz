'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GameState, Question } from '@/types/game';
import { useGameAudio } from '@/hooks/useGameAudio';
import { motion, AnimatePresence } from 'framer-motion';
import { DigitalTimer } from '@/components/game/DigitalTimer';
import { clsx } from 'clsx';

// ... (Other components: CountBadge, etc. same as before)
function CountBadge({ count, className }: { count: number, className?: string }) {
    return (
        <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={clsx("absolute z-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl px-2 py-1 shadow-2xl border-2 border-white/50 min-w-[80px] text-center", className)}
        >
            <span className="text-white font-black text-4xl font-mono drop-shadow-md">{count}</span>
        </motion.div>
    );
}

// ... (Variants: GridImageVariant, TextOnlyVariant remain largely same, just imported)
// Note: To save tokens, I will reprint the RankingBoard mostly and minimal scaffolding, 
// but I must provide the FULL file content for `ScreenPage` if I use `write_to_file`.
// The user has `GridImageVariant` and `TextOnlyVariant` from previous step. 
// I will reproduce them to ensure the file is complete.

function GridImageVariant({ question, phase, counts }: { question: Question, phase: string, counts: Record<string, number> }) {
    return (
        <div className="w-full h-full flex flex-col p-4 md:p-8 pb-32 max-w-7xl mx-auto gap-4">
            {/* Question Header */}
            <div className="bg-blue-900/80 backdrop-blur border-2 border-blue-400 rounded-2xl p-6 shadow-xl z-20 shrink-0">
                <h2 className="text-3xl md:text-5xl font-bold text-white text-center drop-shadow-md">{question.text}</h2>
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4 md:gap-8 min-h-0">
                {question.options.map((opt, i) => {
                    const isCorrect = phase === 'REVEAL' && opt.id === question.correct_answer;
                    const isDimmed = phase === 'REVEAL' && opt.id !== question.correct_answer;
                    return (
                        <motion.div
                            key={opt.id} layoutId={`opt-${opt.id}`}
                            className={clsx("relative bg-white rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border-4 transition-all duration-500", isCorrect ? "border-yellow-400 z-10 scale-[1.02]" : "border-slate-300")}
                            style={{ opacity: isDimmed ? 0.4 : 1 }}
                        >
                            {/* Image is Main Content */}
                            <div className="absolute inset-0 bg-slate-100">
                                {opt.image_url ? (
                                    <img src={opt.image_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-2xl">NO IMAGE</div>
                                )}
                            </div>

                            {/* Label Overlay - ONLY on REVEAL */}
                            {phase === 'REVEAL' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 backdrop-blur-sm">
                                    <div className="text-white text-xl md:text-3xl font-bold text-center">{opt.label}</div>
                                </div>
                            )}

                            {/* Number Badge */}
                            <div className="absolute top-4 left-4 w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-b from-pink-400 to-pink-600 border-2 md:border-4 border-white shadow-lg flex items-center justify-center text-2xl md:text-4xl font-black text-white drop-shadow-md z-10">
                                {i + 1}
                            </div>

                            {(phase === 'DISTRIBUTION' || phase === 'REVEAL') && (<CountBadge count={counts[opt.id] || 0} className="bottom-4 right-4" />)}
                            {isCorrect && <div className="absolute inset-0 ring-8 ring-yellow-400 shadow-[0_0_50px_rgba(255,215,0,0.8)] animate-pulse rounded-3xl pointer-events-none" />}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function TextOnlyVariant({ question, phase, counts }: { question: Question, phase: string, counts: Record<string, number> }) {
    return (
        <div className="w-full h-full flex flex-col p-8 pb-32 gap-6 max-w-7xl mx-auto">
            <div className="flex-[2] bg-blue-500/10 rounded-3xl border-2 border-blue-400/30 flex overflow-hidden shadow-xl backdrop-blur-sm relative">
                <div className="w-24 md:w-32 bg-gradient-to-b from-blue-400 to-blue-600 flex items-center justify-center shadow-lg z-10">
                    <span className="text-6xl md:text-7xl font-black text-white italic drop-shadow-md">Q.</span>
                </div>
                <div className="flex-1 p-8 flex items-center justify-center"><h2 className="text-5xl md:text-7xl font-bold text-white leading-tight drop-shadow-lg text-center">{question.text}</h2></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
            </div>
            <div className="flex-[3] flex flex-col justify-center gap-4 relative pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-24 md:w-32 flex flex-col gap-4 py-2 pointer-events-none">
                    <div className="flex-1 bg-gradient-to-b from-pink-400 to-pink-600 rounded-l-2xl flex items-center justify-center shadow-lg opacity-90"><span className="text-6xl md:text-7xl font-black text-white italic drop-shadow-md">A.</span></div>
                </div>
                <div className="flex-1 flex flex-col gap-3 pl-20 md:pl-28">
                    {question.options.map((opt, i) => {
                        const isCorrect = phase === 'REVEAL' && opt.id === question.correct_answer;
                        const isDimmed = phase === 'REVEAL' && opt.id !== question.correct_answer;
                        return (
                            <motion.div
                                key={opt.id} layoutId={`opt-${opt.id}`}
                                className={clsx("flex-1 relative rounded-r-2xl flex items-center px-8 border-2 shadow-lg transition-all", isCorrect ? "bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-300 scale-[1.02] z-10" : "bg-gradient-to-r from-blue-900 to-blue-800 border-blue-400/50")}
                                style={{ opacity: isDimmed ? 0.3 : 1 }}
                            >
                                <div className={clsx("w-14 h-14 rounded-full border-2 border-white shadow-md flex items-center justify-center text-3xl font-black text-white mr-6 bg-gradient-to-b", i === 0 ? 'from-blue-400 to-blue-600' : i === 1 ? 'from-red-400 to-red-600' : i === 2 ? 'from-green-400 to-green-600' : 'from-yellow-400 to-yellow-600')}>{i + 1}</div>
                                <span className="text-3xl md:text-4xl font-bold text-white">{opt.label}</span>
                                {(phase === 'DISTRIBUTION' || phase === 'REVEAL') && (<div className="ml-auto"><div className="bg-pink-600 text-white font-mono text-3xl px-4 py-1 rounded-lg border border-white/30 shadow-inner">{counts[opt.id] || 0}</div></div>)}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// --- NEW Ranking Board ---
function RankingBoard({ questionId, onlineUsers }: { questionId: string, onlineUsers: Set<string> }) {
    const [allLeaders, setAllLeaders] = useState<any[]>([]);
    const [pageIndex, setPageIndex] = useState(0);
    const PAGE_SIZE = 10;

    // Fetch Data
    useEffect(() => {
        const fetch = async () => {
            const { data: answers } = await supabase.from('answers').select('user_id, latency_diff, answer_value').eq('question_id', questionId).order('latency_diff', { ascending: true });
            if (!answers) return;
            const { data: q } = await supabase.from('questions').select('correct_answer').eq('id', questionId).single();
            const valid = answers.filter((a: any) => a.answer_value.choice === q?.correct_answer);
            const onlineValid = valid.filter(a => onlineUsers.has(a.user_id));
            const uids = onlineValid.map(a => a.user_id);
            const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', uids);

            // Assign ranks based on sorted order
            const merged = onlineValid.map((a, i) => ({ ...a, profile: profiles?.find(p => p.id === a.user_id), rank: i + 1 }));

            // Handle Pagination Logic Request: "Show >10, switch after delay"
            setAllLeaders(merged);
        };
        fetch();
    }, [questionId, onlineUsers]);

    // Cycling Logic
    useEffect(() => {
        if (allLeaders.length <= PAGE_SIZE) return;

        // Sequence: Page 0 (Top 10) -> Wait ~8s -> Page 1 (Rest) -> Wait -> Loop? Or Stop?
        // User said: "Show 10... 1 sec after done... Show remaining"
        // Let's loop for now so everyone gets screen time.

        const totalPages = Math.ceil(allLeaders.length / PAGE_SIZE);
        const interval = setInterval(() => {
            setPageIndex(current => (current + 1) % totalPages);
        }, 8000); // 8 seconds per page (enough for animations + reading)

        return () => clearInterval(interval);
    }, [allLeaders]);

    const visibleLeaders = allLeaders.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

    return (
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="absolute inset-0 z-50 bg-blue-900/40 backdrop-blur-md p-10 flex flex-col items-center">
            {/* Title Banner */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 w-32 md:w-48 h-[80vh] bg-gradient-to-b from-blue-500 to-blue-700 rounded-2xl border-4 border-blue-400 shadow-2xl flex flex-col items-center justify-center">
                <div className="text-white font-black text-6xl md:text-7xl writing-vertical-rl tracking-widest drop-shadow-md h-full py-8">
                    早押しランキング
                </div>
                {/* Page Indicator */}
                {allLeaders.length > PAGE_SIZE && (
                    <div className="absolute -bottom-16 text-white text-2xl font-bold font-mono">
                        {pageIndex + 1} / {Math.ceil(allLeaders.length / PAGE_SIZE)}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="w-full max-w-5xl space-y-2 mt-8 mr-40">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pageIndex} // Key ensures re-render & animation on page switch
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-2"
                    >
                        {visibleLeaders.map((item, i) => {
                            // Stagger logic relative to page start
                            const globalIndex = (pageIndex * PAGE_SIZE) + i;
                            const isLastOverall = globalIndex === allLeaders.length - 1;
                            // Tease Delay: If it's the very last person (and list is decent size), wait extra 2.5s
                            const delay = i * 0.1 + (isLastOverall && allLeaders.length > 5 ? 2.5 : 0);

                            return (
                                <motion.div
                                    key={item.user_id}
                                    initial={{ x: 100, opacity: 0, rotateX: 90 }}
                                    animate={{ x: 0, opacity: 1, rotateX: 0 }}
                                    transition={{ delay, type: 'spring', damping: 12 }}
                                    className="flex items-center h-16 md:h-20 bg-gradient-to-b from-blue-600 to-blue-800 border-2 border-blue-300 rounded-lg shadow-lg relative overflow-hidden group"
                                >
                                    {/* Rank Box */}
                                    <div className="w-20 md:w-24 h-full bg-blue-900/50 border-r-2 border-blue-400 flex items-center justify-center">
                                        <span className="text-4xl md:text-5xl font-black text-white italic font-mono">{item.rank}</span>
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 px-6">
                                        <span className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm truncate block">{item.profile?.display_name}</span>
                                    </div>

                                    {/* Time */}
                                    <div className="w-40 md:w-48 h-full bg-gradient-to-b from-yellow-400 to-yellow-500 border-l-2 border-blue-300 flex items-center justify-center relative">
                                        <span className="text-3xl md:text-4xl font-black text-blue-900 font-mono tracking-tighter">
                                            {(item.latency_diff / 1000).toFixed(2)}
                                        </span>
                                        <span className="text-xs font-bold text-blue-900 absolute bottom-1 right-2">SEC</span>
                                    </div>

                                    {/* Gloss */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none h-1/2" />
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}


// --- Main Page ---
const BG_STYLE = {
    backgroundColor: '#002244',
    backgroundImage: `radial-gradient(circle, #0055aa 15%, transparent 16%), radial-gradient(circle, #0055aa 15%, transparent 16%)`,
    backgroundSize: '30px 30px',
    backgroundPosition: '0 0, 15px 15px'
};

export default function ScreenPage() {
    const [gameState, setGameState] = useState<GameState>({ phase: 'IDLE', current_question_id: null, start_timestamp: 0 });
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set()); // Track Online Users
    const { isReady, enableAudio } = useGameAudio(gameState.phase);

    useEffect(() => {
        // Game State Sync
        supabase.from('game_state').select('*').single().then(({ data }) => { if (data) updateState(data); });
        const channel = supabase.channel('screen_room').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, (p) => updateState(p.new as GameState)).subscribe();

        // Presence Sync (Track who is online)
        const presenceChannel = supabase.channel('global_presence')
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const ids = new Set(Object.keys(state));
                setOnlineUsers(ids);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(presenceChannel);
        };
    }, []);

    // Dedicated Effect for Question Edits
    useEffect(() => {
        let qChannel: any; // Listener for Question Edits

        // NEW: Always listen for changes to the CURRENT QUESTION
        if (gameState.current_question_id) {
            qChannel = supabase.channel(`question_sync_${gameState.current_question_id}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions', filter: `id=eq.${gameState.current_question_id}` },
                    (payload) => {
                        setGameState(prev => ({ ...prev, question: payload.new as Question }));
                    })
                .subscribe();
        }

        return () => {
            if (qChannel) supabase.removeChannel(qChannel);
        };
    }, [gameState.current_question_id]);

    const updateState = async (newState: GameState) => {
        if (newState.current_question_id && newState.current_question_id !== gameState.current_question_id) {
            const { data: q } = await supabase.from('questions').select('*').eq('id', newState.current_question_id).single();
            if (q) newState.question = q;
            setCounts({});
        } else {
            newState.question = gameState.question;
        }
        setGameState(newState);
    };

    // Re-calculate counts whenever `onlineUsers` changes or `gameState` updates
    // This solves the 'Ghost' issue by strictly filtering against the current presence set.
    useEffect(() => {
        if (['DISTRIBUTION', 'REVEAL'].includes(gameState.phase) && gameState.current_question_id) {
            const fetchAndSubscribe = async () => {
                const qId = gameState.current_question_id!;

                // Fetch ALL answers for this question
                const { data: allAnswers } = await supabase.from('answers').select('answer_value, user_id').eq('question_id', qId);

                // Filter: Only track answers from ONLINE users
                const validAnswers = allAnswers?.filter((a: any) => onlineUsers.has(a.user_id)) || [];

                const c: Record<string, number> = {};
                validAnswers.forEach((a: any) => { const k = a.answer_value.choice; c[k] = (c[k] || 0) + 1; });
                setCounts(c);

                // Realtime: Listen for new answers
                const channel = supabase.channel('answers_dist_realtime')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: `question_id=eq.${qId}` },
                        (payload) => {
                            const ans = payload.new as any;
                            // Only add if user is ONLINE
                            if (onlineUsers.has(ans.user_id)) {
                                const k = ans.answer_value.choice;
                                setCounts(prev => ({ ...prev, [k]: (prev[k] || 0) + 1 }));
                            }
                        })
                    .subscribe();

                return () => { supabase.removeChannel(channel); };
            };
            const cleanupPromise = fetchAndSubscribe();
            return () => { cleanupPromise.then(cleanup => cleanup()); };
        }
    }, [gameState.phase, gameState.current_question_id, onlineUsers]);

    if (!isReady) return <div onClick={enableAudio} className="min-h-screen bg-black text-white flex flex-col items-center justify-center cursor-pointer font-bold text-3xl">CLICK TO START</div>;

    const hasImages = gameState.question?.options.some(o => !!o.image_url);
    const isTextMode = gameState.question && !hasImages;

    return (
        <div className="min-h-screen relative overflow-hidden font-sans select-none flex flex-col" style={BG_STYLE}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-pink-900/30 pointer-events-none" />

            <div className="flex-1 relative z-10 flex flex-col">
                <AnimatePresence>
                    {gameState.phase === 'IDLE' && (
                        <motion.div key="idle" exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
                            <h1 className="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-pink-500 drop-shadow-2xl">ALL STAR QUIZ</h1>
                        </motion.div>
                    )}
                </AnimatePresence>

                {gameState.current_question_id && gameState.question && ['INTRO', 'ACTIVE', 'LOCKED', 'DISTRIBUTION', 'REVEAL'].includes(gameState.phase) && (
                    isTextMode
                        ? <TextOnlyVariant question={gameState.question} phase={gameState.phase} counts={counts} />
                        : <GridImageVariant question={gameState.question} phase={gameState.phase} counts={counts} />
                )}

                {gameState.phase === 'RANKING' && gameState.current_question_id && (
                    <RankingBoard questionId={gameState.current_question_id} onlineUsers={onlineUsers} />
                )}
            </div>

            {['ACTIVE', 'LOCKED'].includes(gameState.phase) && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 md:right-8 z-50">
                    <div className="w-40 h-64 bg-red-600 rounded-l-full flex items-center justify-center border-l-4 border-white shadow-2xl relative translate-x-12 hover:translate-x-0 transition-transform">
                        <div className="w-24 h-24 bg-black rounded-full border-4 border-white flex items-center justify-center relative -left-6 shadow-inner">
                            <DigitalTimer duration={gameState.question?.time_limit || 10} startTime={Number(gameState.start_timestamp)} phase={gameState.phase} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
