-- RPC Functions for Game Logic

-- 1. Revive All Players
create or replace function revive_all()
returns void
language plpgsql
security definer
as $$
begin
  update profiles set is_eligible = true;
end;
$$;

-- 2. Eliminate Players (Batch)
create or replace function eliminate_players(victim_ids uuid[])
returns void
language plpgsql
security definer
as $$
begin
  update profiles set is_eligible = false where id = any(victim_ids);
end;
$$;

-- 3. Reset Question Answers
create or replace function reset_question_answers(target_question_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from answers where question_id = target_question_id;
end;
$$;

-- 4. SOFT RESET (Restart Game, Keep Players)
create or replace function restart_game()
returns void
language plpgsql
security definer
as $$
begin
  -- Clear Answers (Except fake admin if any)
  delete from answers;
  
  -- Reset Profiles (Score 0, Eligible True)
  update profiles set score = 0, is_eligible = true;
  
  -- Reset Game State
  update game_state set phase = 'IDLE', current_question_id = null, start_timestamp = 0 where id = 1;
end;
$$;
