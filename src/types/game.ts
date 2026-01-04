export type UserProfile = {
    id: string;
    display_name: string;
    real_name: string | null;
    created_at: string;
    score: number;
    is_eligible: boolean; // For "Stand up / Sit down" survival
};

export type QuestionType = 'choice4' | 'choice2' | 'sort';

export type QuestionOption = {
    id: string;
    label: string;
    image_url?: string;
    color?: string;
};

export type Question = {
    id: string;
    type: QuestionType;
    text: string;
    media_url?: string;
    media_type?: 'image' | 'video';
    options: QuestionOption[];
    correct_answer: string | string[];
    time_limit: number;
};

export type GamePhase =
    | 'IDLE'
    | 'INTRO'
    | 'READING'
    | 'COUNTDOWN'
    | 'ACTIVE'        // Timer running
    | 'LOCKED'        // Time Up (Wait for next step)
    | 'DISTRIBUTION'  // Show vote counts (Digital style)
    | 'REVEAL'        // Show correct answer
    | 'RANKING'       // Show fastest finger list
    | 'RESULT';       // Final Result (optional)

export type GameState = {
    phase: GamePhase;
    current_question_id: string | null;
    start_timestamp: number;
    question?: Question;
};

export type AnswerSubmission = {
    user_id: string;
    question_id: string;
    answer_value: string | string[];
    client_timestamp: number;
    latency_diff: number;
};
