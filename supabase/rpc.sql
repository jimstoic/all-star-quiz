-- Existing revive_all
create or replace function revive_all()
returns void
language sql
security definer
as $$
  update profiles
  set is_eligible = true
  where id != '00000000-0000-0000-0000-000000000000'; 
$$;

-- NEW: Eliminate specific players
create or replace function eliminate_players(victim_ids uuid[])
returns void
language sql
security definer
as $$
  update profiles
  set is_eligible = false
  where id = any(victim_ids);
$$;

grant execute on function revive_all() to anon, authenticated, service_role;
grant execute on function eliminate_players(uuid[]) to anon, authenticated, service_role;
