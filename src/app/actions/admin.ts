'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function setGamePhase(phase: string, questionId: string | null = null) {
    const update: any = { phase };
    if (questionId) update.current_question_id = questionId;

    // CRITICAL: If going ACTIVE, set Server Timestamp
    if (phase === 'ACTIVE') {
        update.start_timestamp = Date.now();
    }

    try {
        await supabase.from('game_state').update(update).eq('id', 1);
        return { success: true };
    } catch (e) {
        console.error("Set Phase Error:", e);
        return { success: false, error: e };
    }
}
