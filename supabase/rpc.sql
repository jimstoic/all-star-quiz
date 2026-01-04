-- Revive All Players Function (RPC) - Corrected UUID
-- Run this in Supabase SQL Editor

-- 1. Create the function with "SECURITY DEFINER"
create or replace function revive_all()
returns void
language sql
security definer
as $$
  update profiles
  set is_eligible = true
  where id != '00000000-0000-0000-0000-000000000000'; 
$$;

-- 2. Allow everyone to call this function
grant execute on function revive_all() to anon, authenticated, service_role;
