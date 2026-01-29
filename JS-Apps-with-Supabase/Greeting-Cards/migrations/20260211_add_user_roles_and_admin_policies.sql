do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
  ) then
    create type public.app_role as enum ('user', 'admin');
  end if;
end $$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "User roles read" on public.user_roles;
drop policy if exists "User roles insert admin" on public.user_roles;
drop policy if exists "User roles update admin" on public.user_roles;
drop policy if exists "User roles delete admin" on public.user_roles;

create policy "User roles read" on public.user_roles
  for select
  using (true);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and user_role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

create policy "User roles insert admin" on public.user_roles
  for insert
  with check (public.is_admin());

create policy "User roles update admin" on public.user_roles
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "User roles delete admin" on public.user_roles
  for delete
  using (public.is_admin());

alter table public.cards enable row level security;

drop policy if exists "Cards select own" on public.cards;
drop policy if exists "Cards insert own" on public.cards;
drop policy if exists "Cards update own" on public.cards;
drop policy if exists "Cards delete own" on public.cards;
drop policy if exists "Cards select own or admin" on public.cards;
drop policy if exists "Cards insert own or admin" on public.cards;
drop policy if exists "Cards update own or admin" on public.cards;
drop policy if exists "Cards delete own or admin" on public.cards;

create policy "Cards select own or admin" on public.cards
  for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Cards insert own or admin" on public.cards
  for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Cards update own or admin" on public.cards
  for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Cards delete own or admin" on public.cards
  for delete
  using (auth.uid() = user_id or public.is_admin());
