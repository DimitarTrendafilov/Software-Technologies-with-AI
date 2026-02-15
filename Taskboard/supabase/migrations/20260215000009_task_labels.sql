-- Add labels and task_labels

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  color text not null default '#6c757d',
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists idx_labels_project_id on public.labels(project_id);

create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

create index if not exists idx_task_labels_task_id on public.task_labels(task_id);
create index if not exists idx_task_labels_label_id on public.task_labels(label_id);

alter table public.labels enable row level security;
alter table public.task_labels enable row level security;

-- Labels RLS
create policy "Users can view labels in accessible projects"
  on public.labels for select
  using (public.user_can_access_project(project_id) or public.is_admin());

create policy "Users can create labels in accessible projects"
  on public.labels for insert
  with check (public.user_can_access_project(project_id) or public.is_admin());

create policy "Users can update labels in accessible projects"
  on public.labels for update
  using (public.user_can_access_project(project_id) or public.is_admin())
  with check (public.user_can_access_project(project_id) or public.is_admin());

create policy "Users can delete labels in accessible projects"
  on public.labels for delete
  using (public.user_can_access_project(project_id) or public.is_admin());

-- Task labels RLS
create policy "Users can view task labels in accessible projects"
  on public.task_labels for select
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());

create policy "Users can create task labels in accessible projects"
  on public.task_labels for insert
  with check (
    (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin())
    and exists (
      select 1
      from public.labels l
      where l.id = label_id
        and l.project_id = public.project_id_from_task(task_id)
    )
  );

create policy "Users can delete task labels in accessible projects"
  on public.task_labels for delete
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());
