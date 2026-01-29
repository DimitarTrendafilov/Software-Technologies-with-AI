create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  image_template text not null,
  greeting_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards(user_id);

alter table public.cards enable row level security;

drop policy if exists "Cards select own" on public.cards;
drop policy if exists "Cards insert own" on public.cards;
drop policy if exists "Cards update own" on public.cards;
drop policy if exists "Cards delete own" on public.cards;

create policy "Cards select own" on public.cards
  for select
  using (auth.uid() = user_id);

create policy "Cards insert own" on public.cards
  for insert
  with check (auth.uid() = user_id);

create policy "Cards update own" on public.cards
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Cards delete own" on public.cards
  for delete
  using (auth.uid() = user_id);
