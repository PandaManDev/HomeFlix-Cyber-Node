-- HomeFlix account data security
-- Run in Supabase SQL Editor. The browser publishable/anon key is expected to be public;
-- access control must be enforced by RLS, not by hiding that key.

create table if not exists public.homeflix_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.homeflix_user_data enable row level security;
alter table public.homeflix_user_data force row level security;

revoke all on table public.homeflix_user_data from anon;
grant select, insert, update, delete on table public.homeflix_user_data to authenticated;

drop policy if exists "Users can read their own HomeFlix data" on public.homeflix_user_data;
create policy "Users can read their own HomeFlix data"
  on public.homeflix_user_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own HomeFlix data" on public.homeflix_user_data;
create policy "Users can insert their own HomeFlix data"
  on public.homeflix_user_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own HomeFlix data" on public.homeflix_user_data;
create policy "Users can update their own HomeFlix data"
  on public.homeflix_user_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own HomeFlix data" on public.homeflix_user_data;
create policy "Users can delete their own HomeFlix data"
  on public.homeflix_user_data for delete
  to authenticated
  using (auth.uid() = user_id);
