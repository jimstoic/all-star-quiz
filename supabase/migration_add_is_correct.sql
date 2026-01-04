-- Add is_correct column to answers table
alter table answers add column is_correct boolean default null;
