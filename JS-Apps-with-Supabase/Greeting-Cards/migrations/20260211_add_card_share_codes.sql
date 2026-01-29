create extension if not exists pgcrypto;

create or replace function public.generate_share_code()
returns text
language plpgsql
as $$
declare
  generated_code text;
  code_exists boolean;
begin
  loop
    generated_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 5));
    select exists(select 1 from public.cards where share_code = generated_code) into code_exists;
    if not code_exists then
      return generated_code;
    end if;
  end loop;
end;
$$;

alter table public.cards
  add column if not exists share_code text;

update public.cards
  set share_code = public.generate_share_code()
  where share_code is null;

alter table public.cards
  alter column share_code set default public.generate_share_code();

alter table public.cards
  alter column share_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cards_share_code_unique'
  ) then
    alter table public.cards
      add constraint cards_share_code_unique unique (share_code);
  end if;
end $$;

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

create or replace function public.get_shared_card(share_code_input text)
returns setof public.cards
language sql
security definer
set search_path = public
set row_security = off
as $$
  select *
  from public.cards
  where share_code = share_code_input
  limit 1;
$$;

grant execute on function public.get_shared_card(text) to anon, authenticated;
