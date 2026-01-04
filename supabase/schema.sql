-- All Star Quiz Schema (Reset & Init)

-- ⚠️ WARNING: This will delete all existing data!
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS game_state CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles (Players)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  real_name text,
  score int default 0,
  is_eligible boolean default true,
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

-- 2. Game State
create table game_state (
  id int primary key default 1,
  phase text default 'IDLE',
  current_question_id uuid,
  start_timestamp bigint default 0,
  updated_at timestamptz default now()
);

-- Initialize Game State
insert into game_state (id, phase) values (1, 'IDLE');

-- 3. Questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'choice4',
  text text not null,
  media_url text,
  media_type text,
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb not null, -- JSON String (e.g. "opt1") or Array
  time_limit int default 10,
  created_at timestamptz default now()
);

-- 4. Answers
create table answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  question_id uuid references questions(id),
  answer_value jsonb not null,
  client_timestamp bigint,
  latency_diff int,
  created_at timestamptz default now()
);

-- Security
alter table profiles enable row level security;
alter table game_state enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;

-- Policies (We dropped tables so policies are gone, safe to create)
create policy "Enable all access for profiles" on profiles for all using (true) with check (true);
create policy "Enable all access for game_state" on game_state for all using (true) with check (true);
create policy "Enable all access for questions" on questions for all using (true) with check (true);
create policy "Enable all access for answers" on answers for all using (true) with check (true);

-- Realtime Setup (Safe Re-run)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'game_state') then
    alter publication supabase_realtime add table game_state;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table profiles;
  end if;
end;
$$;
