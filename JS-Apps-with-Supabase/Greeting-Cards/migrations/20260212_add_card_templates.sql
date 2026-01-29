create table if not exists public.card_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_path text not null,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.card_templates enable row level security;

drop policy if exists "Card templates select all" on public.card_templates;
drop policy if exists "Card templates insert admin" on public.card_templates;
drop policy if exists "Card templates update admin" on public.card_templates;
drop policy if exists "Card templates delete admin" on public.card_templates;

create policy "Card templates select all" on public.card_templates
  for select
  using (true);

create policy "Card templates insert admin" on public.card_templates
  for insert
  with check (public.is_admin());

create policy "Card templates update admin" on public.card_templates
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Card templates delete admin" on public.card_templates
  for delete
  using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('card-templates', 'card-templates', true)
on conflict (id) do update set public = true;

drop policy if exists "Card templates images public read" on storage.objects;
drop policy if exists "Card templates images admin insert" on storage.objects;
drop policy if exists "Card templates images admin update" on storage.objects;
drop policy if exists "Card templates images admin delete" on storage.objects;

create policy "Card templates images public read" on storage.objects
  for select
  using (bucket_id = 'card-templates');

create policy "Card templates images admin insert" on storage.objects
  for insert
  with check (bucket_id = 'card-templates' and public.is_admin());

create policy "Card templates images admin update" on storage.objects
  for update
  using (bucket_id = 'card-templates' and public.is_admin())
  with check (bucket_id = 'card-templates' and public.is_admin());

create policy "Card templates images admin delete" on storage.objects
  for delete
  using (bucket_id = 'card-templates' and public.is_admin());
