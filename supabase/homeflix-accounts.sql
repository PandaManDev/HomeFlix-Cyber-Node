-- HomeFlix Cyber Node account data
-- Run this in Supabase Dashboard -> SQL Editor.
-- Row Level Security ensures users can only read/write their own profile data.
create table if not exists public.homeflix_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.homeflix_user_data enable row level security;

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

grant select, insert, update on public.homeflix_user_data to authenticated;
