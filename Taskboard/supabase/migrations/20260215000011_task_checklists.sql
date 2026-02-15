-- Add task checklist items

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  content text not null,
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_checklist_task_id on public.task_checklist_items(task_id);
create index if not exists idx_task_checklist_position on public.task_checklist_items(task_id, position);

alter table public.task_checklist_items enable row level security;

create policy "Users can view checklist items in accessible projects"
  on public.task_checklist_items for select
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());

create policy "Users can create checklist items in accessible projects"
  on public.task_checklist_items for insert
  with check (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());

create policy "Users can update checklist items in accessible projects"
  on public.task_checklist_items for update
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin())
  with check (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());

create policy "Users can delete checklist items in accessible projects"
  on public.task_checklist_items for delete
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());
