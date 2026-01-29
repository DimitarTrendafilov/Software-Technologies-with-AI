drop policy if exists "Card templates insert admin" on public.card_templates;
drop policy if exists "Card templates update admin" on public.card_templates;
drop policy if exists "Card templates delete admin" on public.card_templates;

drop policy if exists "Card templates insert temp" on public.card_templates;
drop policy if exists "Card templates update temp" on public.card_templates;
drop policy if exists "Card templates delete temp" on public.card_templates;

create policy "Card templates insert temp" on public.card_templates
  for insert
  with check (true);

create policy "Card templates update temp" on public.card_templates
  for update
  using (true)
  with check (true);

create policy "Card templates delete temp" on public.card_templates
  for delete
  using (true);

alter table public.card_templates enable row level security;

drop policy if exists "Card templates images admin insert" on storage.objects;
drop policy if exists "Card templates images admin update" on storage.objects;
drop policy if exists "Card templates images admin delete" on storage.objects;

drop policy if exists "Card templates images insert temp" on storage.objects;
drop policy if exists "Card templates images update temp" on storage.objects;
drop policy if exists "Card templates images delete temp" on storage.objects;

create policy "Card templates images insert temp" on storage.objects
  for insert
  with check (bucket_id = 'card-templates');

create policy "Card templates images update temp" on storage.objects
  for update
  using (bucket_id = 'card-templates')
  with check (bucket_id = 'card-templates');

create policy "Card templates images delete temp" on storage.objects
  for delete
  using (bucket_id = 'card-templates');
