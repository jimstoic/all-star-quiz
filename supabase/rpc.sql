-- Revive All Players Function (RPC)
-- Run this in Supabase SQL Editor

-- 1. Create the function with "SECURITY DEFINER"
-- This means "Run this function with the permissions of the Creator (Administrator)"
-- effectively bypassing Row Level Security (RLS) for this specific action.
create or replace function revive_all()
returns void
language sql
security definer
as $$
  update profiles
  set is_eligible = true
  where id != '0000-0000';
$$;

-- 2. Allow everyone to call this function (or restrict if you have auth)
-- Since your app logic controls who clicks the button, this is acceptable for now.
grant execute on function revive_all() to anon, authenticated, service_role;
