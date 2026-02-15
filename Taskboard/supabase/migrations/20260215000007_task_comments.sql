-- Task discussions/comments per task

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint task_comments_content_length check (char_length(trim(content)) between 1 and 2000)
);

create index if not exists idx_task_comments_task_id on public.task_comments(task_id);
create index if not exists idx_task_comments_author_id on public.task_comments(author_id);

alter table public.task_comments enable row level security;

drop policy if exists "Users can view comments in accessible projects" on public.task_comments;
drop policy if exists "Users can create comments in accessible projects" on public.task_comments;
drop policy if exists "Comment authors/owners/admin can delete comments" on public.task_comments;

create policy "Users can view comments in accessible projects"
  on public.task_comments for select
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());

create policy "Users can create comments in accessible projects"
  on public.task_comments for insert
  with check (
    (author_id = auth.uid() and public.user_can_access_project(public.project_id_from_task(task_id)))
    or public.is_admin()
  );

create policy "Comment authors/owners/admin can delete comments"
  on public.task_comments for delete
  using (
    author_id = auth.uid()
    or public.user_owns_project(public.project_id_from_task(task_id))
    or public.is_admin()
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_comments'
  ) then
    alter publication supabase_realtime add table public.task_comments;
  end if;
end
$$;
