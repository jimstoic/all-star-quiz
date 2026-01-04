'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils'; // Assuming you have this from shadcn or custom

export default function LoginPage() {
    const router = useRouter();
    const [realName, setRealName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Check valid session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('asq_user');
        if (savedUser) {
            router.push('/play');
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!realName.trim() || !displayName.trim()) return;

        setIsLoading(true);

        // Generate specific ID or let Supabase handle it? 
        // We'll trust Supabase or generate a UUID if we were offline.
        // For now, simple insert.

        try {
            // 1. Save to Supabase (Must succeed for FK constraints)
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    real_name: realName,
                    display_name: displayName,
                    score: 0,
                    last_active_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error("No data returned");

            // 2. Save to LocalStorage
            const userProfile = { id: data.id, realName, displayName };
            localStorage.setItem('asq_user', JSON.stringify(userProfile));

            // 3. Redirect
            router.push('/play');

        } catch (err: any) {
            console.error(err);
            alert(`Login Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-white">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8"
            >
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        ALL STAR QUIZ
                    </h1>
                    <p className="mt-2 text-slate-400">Enter your details to join the game.</p>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-6 bg-slate-900 p-8 rounded-xl shadow-2xl border border-slate-800">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="real-name" className="block text-sm font-medium text-slate-300">
                                お名前 (本名)
                                <span className="ml-2 text-xs text-slate-500">*管理者のみ公開</span>
                            </label>
                            <input
                                id="real-name"
                                name="real-name"
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="田中 太郎"
                                value={realName}
                                onChange={(e) => setRealName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="display-name" className="block text-sm font-medium text-slate-300">
                                ニックネーム
                                <span className="ml-2 text-xs text-slate-500">*ランキングに表示</span>
                            </label>
                            <input
                                id="display-name"
                                name="display-name"
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                placeholder="タナカ"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={cn(
                            "group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-bold text-white hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? 'Joining...' : 'ENTRY PUSH!'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
