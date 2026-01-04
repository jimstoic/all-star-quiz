-- Add Unique Constraint to Answers
-- Run this in SQL Editor to patch existing DB
alter table answers add constraint answers_user_question_unique unique (user_id, question_id);
