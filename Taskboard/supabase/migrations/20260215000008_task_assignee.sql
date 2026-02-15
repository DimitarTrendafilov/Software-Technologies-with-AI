-- Assign responsible user to tasks

alter table public.tasks
add column if not exists assignee_id uuid references auth.users(id) on delete set null;

create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);

create or replace function public.user_is_project_member(check_project_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = check_project_id
      and (
        p.owner_id = check_user_id
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = check_user_id
        )
      )
  );
$$;

drop policy if exists "Users can create tasks in accessible projects" on public.tasks;
drop policy if exists "Users can update tasks in accessible projects" on public.tasks;

create policy "Users can create tasks in accessible projects"
  on public.tasks for insert
  with check (
    (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin())
    and (
      assignee_id is null
      or public.user_is_project_member(public.project_id_from_stage(stage_id), assignee_id)
      or public.is_admin()
    )
  );

create policy "Users can update tasks in accessible projects"
  on public.tasks for update
  using (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin())
  with check (
    (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin())
    and (
      assignee_id is null
      or public.user_is_project_member(public.project_id_from_stage(stage_id), assignee_id)
      or public.is_admin()
    )
  );
