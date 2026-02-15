-- Task attachments metadata + Supabase Storage policies

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_attachments_task_id on public.task_attachments(task_id);
create index if not exists idx_task_attachments_uploaded_by on public.task_attachments(uploaded_by);

alter table public.task_attachments enable row level security;

drop policy if exists "Users can view attachments in accessible projects" on public.task_attachments;
drop policy if exists "Users can create attachments in accessible projects" on public.task_attachments;
drop policy if exists "Users can delete attachments in accessible projects" on public.task_attachments;

create policy "Users can view attachments in accessible projects"
  on public.task_attachments for select
  using (public.user_can_access_project(public.project_id_from_task(task_id)));

create policy "Users can create attachments in accessible projects"
  on public.task_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and public.user_can_access_project(public.project_id_from_task(task_id))
  );

create policy "Users can delete attachments in accessible projects"
  on public.task_attachments for delete
  using (public.user_can_access_project(public.project_id_from_task(task_id)));

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Users can read task attachments" on storage.objects;
drop policy if exists "Users can upload task attachments" on storage.objects;
drop policy if exists "Users can delete task attachments" on storage.objects;

create policy "Users can read task attachments"
  on storage.objects for select
  using (
    bucket_id = 'task-attachments'
    and public.user_can_access_project(
      public.project_id_from_task((split_part(name, '/', 1))::uuid)
    )
  );

create policy "Users can upload task attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'task-attachments'
    and auth.uid() = owner
    and public.user_can_access_project(
      public.project_id_from_task((split_part(name, '/', 1))::uuid)
    )
  );

create policy "Users can delete task attachments"
  on storage.objects for delete
  using (
    bucket_id = 'task-attachments'
    and public.user_can_access_project(
      public.project_id_from_task((split_part(name, '/', 1))::uuid)
    )
  );
