-- Rode isso no Supabase SQL Editor
create table if not exists public.app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- políticas abertas para funcionar rápido (depois podemos endurecer)
drop policy if exists "app_state_select" on public.app_state;
create policy "app_state_select" on public.app_state for select using (true);

drop policy if exists "app_state_insert" on public.app_state;
create policy "app_state_insert" on public.app_state for insert with check (true);

drop policy if exists "app_state_update" on public.app_state;
create policy "app_state_update" on public.app_state for update using (true) with check (true);
