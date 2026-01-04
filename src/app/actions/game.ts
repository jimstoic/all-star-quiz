'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 1. Calculates scores (Adds points)
 * Called at: DISTRIBUTION or REVEAL
 */
export async function calculateResults(questionId: string) {
    try {
        const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).single();
        if (!question) throw new Error('Question not found');

        const { data: answers } = await supabase.from('answers').select('*').eq('question_id', questionId);
        if (!answers) return { success: true, count: 0 };

        const updates = [];

        // Check Correctness
        for (const ans of answers) {
            let isCorrect = false;
            if (question.type === 'sort') {
                if (JSON.stringify(ans.answer_value.order) === JSON.stringify(question.correct_answer)) isCorrect = true;
            } else {
                if (ans.answer_value.choice === question.correct_answer) isCorrect = true;
            }

            if (isCorrect) {
                const timeLimitMs = (question.time_limit || 10) * 1000;
                const latency = Math.min(ans.latency_diff, timeLimitMs);
                const speedFactor = 1 - (latency / timeLimitMs);
                const earned = Math.floor(50 + (50 * speedFactor));
                updates.push({ user_id: ans.user_id, score_add: earned });
            }
        }

        // Apply Score Updates
        for (const update of updates) {
            const { data: profile } = await supabase.from('profiles').select('score').eq('id', update.user_id).single();
            if (profile) await supabase.from('profiles').update({ score: profile.score + update.score_add }).eq('id', update.user_id);
        }

        return { success: true, correctCount: updates.length };

    } catch (e) {
        console.error("Scoring Error:", e);
        return { success: false, error: e };
    }
}

/**
 * 2. Applies Elimination (Kills players)
 * Called at: End of Phase (Post-Ranking)
 */
export async function applyElimination(questionId: string) {
    try {
        const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).single();
        if (!question) return;

        // Fetch all Active and Eligible users? Or just check answers?
        // Policy: If you are ELIGIBLE and you answered WRONG or DID NOT ANSWER, you die.

        // 1. Get all currently eligible profiles
        const { data: eligibleProfiles } = await supabase.from('profiles').select('id').eq('is_eligible', true);
        if (!eligibleProfiles || eligibleProfiles.length === 0) return { count: 0 };

        // 2. Get all answers for this question
        const { data: answers } = await supabase.from('answers').select('user_id, answer_value').eq('question_id', questionId);
        const answerMap = new Map(answers?.map(a => [a.user_id, a]));

        const victims: string[] = [];

        for (const p of eligibleProfiles) {
            const ans = answerMap.get(p.id);
            let survived = false;

            if (ans) {
                // Check correctness
                if (question.type === 'sort') {
                    if (JSON.stringify(ans.answer_value.order) === JSON.stringify(question.correct_answer)) survived = true;
                } else {
                    if (ans.answer_value.choice === question.correct_answer) survived = true;
                }
            }
            // If no answer, survived = false (Timeout = Elimination)

            if (!survived) {
                victims.push(p.id);
            }
        }

        // 3. Execute Order 66
        if (victims.length > 0) {
            await supabase.from('profiles').update({ is_eligible: false }).in('id', victims);
        }

        return { success: true, eliminatedCount: victims.length };

    } catch (e) {
        console.error(e);
        return { success: false };
    }
}

export async function adminResetGame() {
    await supabase.from('profiles').update({ score: 0, is_eligible: true }).neq('id', '0000-0000');
    await supabase.from('game_state').update({ phase: 'IDLE', current_question_id: null }).eq('id', 1);
}

export async function reviveAllPlayers() {
    try {
        const { error, count } = await supabase.from('profiles').update({ is_eligible: true }).neq('id', '0000-0000').select('id', { count: 'exact' });
        if (error) throw error;
        return { success: true, count };
    } catch (e: any) {
        console.error("Revive Error:", e);
        return { success: false, error: e.message };
    }
}
