create extension if not exists pgcrypto;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.card_labels (
  card_id uuid not null references public.cards(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_boards_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

create trigger set_lists_updated_at
before update on public.lists
for each row execute function public.set_updated_at();

create trigger set_cards_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

create or replace function public.is_board_member(check_board_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = check_board_id
      and (
        b.owner_id = auth.uid()
        or exists (
          select 1
          from public.memberships m
          where m.board_id = b.id
            and m.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.board_id_from_list(check_list_id uuid)
returns uuid
language sql
stable
as $$
  select board_id from public.lists where id = check_list_id;
$$;

create or replace function public.board_id_from_card(check_card_id uuid)
returns uuid
language sql
stable
as $$
  select l.board_id
  from public.cards c
  join public.lists l on l.id = c.list_id
  where c.id = check_card_id;
$$;

alter table public.boards enable row level security;
alter table public.memberships enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;
alter table public.labels enable row level security;
alter table public.card_labels enable row level security;
alter table public.comments enable row level security;
alter table public.activity_events enable row level security;

create policy "Boards select for members"
  on public.boards for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.memberships m
      where m.board_id = boards.id
        and m.user_id = auth.uid()
    )
  );

create policy "Boards insert for owner"
  on public.boards for insert
  with check (owner_id = auth.uid());

create policy "Boards update for owner"
  on public.boards for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Boards delete for owner"
  on public.boards for delete
  using (owner_id = auth.uid());

create policy "Memberships select for members"
  on public.memberships for select
  using (public.is_board_member(board_id));

create policy "Memberships insert by owner"
  on public.memberships for insert
  with check (
    exists (
      select 1
      from public.boards b
      where b.id = memberships.board_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Memberships update by owner"
  on public.memberships for update
  using (
    exists (
      select 1
      from public.boards b
      where b.id = memberships.board_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.boards b
      where b.id = memberships.board_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Memberships delete by owner"
  on public.memberships for delete
  using (
    exists (
      select 1
      from public.boards b
      where b.id = memberships.board_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Lists access for members"
  on public.lists for all
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

create policy "Cards access for members"
  on public.cards for all
  using (public.is_board_member(public.board_id_from_list(list_id)))
  with check (public.is_board_member(public.board_id_from_list(list_id)));

create policy "Labels access for members"
  on public.labels for all
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

create policy "Card labels access for members"
  on public.card_labels for all
  using (
    public.is_board_member(
      public.board_id_from_card(card_id)
    )
  )
  with check (
    public.is_board_member(
      public.board_id_from_card(card_id)
    )
  );

create policy "Comments access for members"
  on public.comments for all
  using (
    public.is_board_member(
      public.board_id_from_card(card_id)
    )
  )
  with check (
    public.is_board_member(
      public.board_id_from_card(card_id)
    )
  );

create policy "Activity events access for members"
  on public.activity_events for all
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));
