-- Function to reset answers for a specific question (Security Definer bypassing RLS)
create or replace function reset_question_answers(target_question_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from answers where question_id = target_question_id;
end;
$$;
