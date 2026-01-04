-- Seed Data for All Star Quiz
-- Run this AFTER schema.sql

-- Clear just in case (though schema reset does it)
truncate table answers, questions restart identity cascade;

-- 1. Text Question (JNN)
-- correct_answer must be a JSON string like "opt3" (double quotes inside single quotes)
INSERT INTO questions (id, type, text, time_limit, options, correct_answer)
VALUES (
  gen_random_uuid(),
  'choice4',
  'JNNは何の略？',
  10,
  '[
    {"id": "opt1", "label": "Japanese News Network", "image_url": null},
    {"id": "opt2", "label": "Japan News Netwark", "image_url": null},
    {"id": "opt3", "label": "Japan News Network", "image_url": null},
    {"id": "opt4", "label": "Japanese News Netwark", "image_url": null}
  ]'::jsonb,
  '"opt3"'::jsonb
);

-- 2. Image Question (Anime Family)
INSERT INTO questions (id, type, text, time_limit, options, correct_answer)
VALUES (
  gen_random_uuid(),
  'choice4',
  '男女6人で生活しているのは？',
  10,
  '[
    {"id": "opt1", "label": "クレヨンしんちゃん", "image_url": "https://placehold.co/400x300.png?text=Shinchan"},
    {"id": "opt2", "label": "サザエさん", "image_url": "https://placehold.co/400x300.png?text=Sazae"},
    {"id": "opt3", "label": "ちびまる子ちゃん", "image_url": "https://placehold.co/400x300.png?text=Maruko"},
    {"id": "opt4", "label": "ドラえもん", "image_url": "https://placehold.co/400x300.png?text=Doraemon"}
  ]'::jsonb,
  '"opt2"'::jsonb
);

-- 3. Simple Trivia (Fastest Animal)
INSERT INTO questions (id, type, text, time_limit, options, correct_answer)
VALUES (
  gen_random_uuid(),
  'choice4',
  'この中で「最も速い」動物は？',
  10,
  '[
    {"id": "opt1", "label": "チーター", "image_url": null},
    {"id": "opt2", "label": "ハヤブサ", "image_url": null},
    {"id": "opt3", "label": "マグロ", "image_url": null},
    {"id": "opt4", "label": "ダチョウ", "image_url": null}
  ]'::jsonb,
  '"opt2"'::jsonb
);
