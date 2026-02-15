-- Admin role support + admin panel database access

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Bootstrap one admin user for local/demo usage (if present)
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'steve@gmail.com';

-- Projects policies: admin can list/view/edit/delete all projects
alter table public.projects enable row level security;

drop policy if exists "Users can view accessible projects" on public.projects;
drop policy if exists "Users can create projects" on public.projects;
drop policy if exists "Project owners can update projects" on public.projects;
drop policy if exists "Project owners can delete projects" on public.projects;

create policy "Users can view accessible projects"
  on public.projects for select
  using (public.user_can_access_project(id) or public.is_admin());

create policy "Users can create projects"
  on public.projects for insert
  with check (owner_id = auth.uid() or public.is_admin());

create policy "Project owners/admin can update projects"
  on public.projects for update
  using (public.user_owns_project(id) or public.is_admin())
  with check (public.user_owns_project(id) or public.is_admin());

create policy "Project owners/admin can delete projects"
  on public.projects for delete
  using (public.user_owns_project(id) or public.is_admin());

-- Project members policies: admin can manage any membership
alter table public.project_members enable row level security;

drop policy if exists "Users can view members of accessible projects" on public.project_members;
drop policy if exists "Project owners can add members" on public.project_members;
drop policy if exists "Project owners can remove members" on public.project_members;

create policy "Users can view members of accessible projects"
  on public.project_members for select
  using (public.user_can_access_project(project_id) or public.is_admin());

create policy "Project owners/admin can add members"
  on public.project_members for insert
  with check (
    (public.user_owns_project(project_id) and user_id <> auth.uid())
    or public.is_admin()
  );

create policy "Project owners/admin can remove members"
  on public.project_members for delete
  using (public.user_owns_project(project_id) or public.is_admin());

-- Stages policies: admin can fully manage all
alter table public.project_stages enable row level security;

drop policy if exists "Users can view stages of accessible projects" on public.project_stages;
drop policy if exists "Users can create stages in accessible projects" on public.project_stages;
drop policy if exists "Users can update stages in accessible projects" on public.project_stages;
drop policy if exists "Users can delete stages in accessible projects" on public.project_stages;

create policy "Users can view stages of accessible projects"
  on public.project_stages for select
  using (public.user_can_access_project(project_id) or public.is_admin());

create policy "Users can create stages in accessible projects"
  on public.project_stages for insert
  with check (public.user_can_access_project(project_id) or public.is_admin());

create policy "Users can update stages in accessible projects"
  on public.project_stages for update
  using (public.user_can_access_project(project_id) or public.is_admin())
  with check (public.user_can_access_project(project_id) or public.is_admin());

create policy "Users can delete stages in accessible projects"
  on public.project_stages for delete
  using (public.user_can_access_project(project_id) or public.is_admin());

-- Tasks policies: admin can fully manage all
alter table public.tasks enable row level security;

drop policy if exists "Users can view tasks in accessible projects" on public.tasks;
drop policy if exists "Users can create tasks in accessible projects" on public.tasks;
drop policy if exists "Users can update tasks in accessible projects" on public.tasks;
drop policy if exists "Users can delete tasks in accessible projects" on public.tasks;

create policy "Users can view tasks in accessible projects"
  on public.tasks for select
  using (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin());

create policy "Users can create tasks in accessible projects"
  on public.tasks for insert
  with check (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin());

create policy "Users can update tasks in accessible projects"
  on public.tasks for update
  using (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin())
  with check (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin());

create policy "Users can delete tasks in accessible projects"
  on public.tasks for delete
  using (public.user_can_access_project(public.project_id_from_stage(stage_id)) or public.is_admin());

-- Task attachments policies: admin can fully manage
alter table public.task_attachments enable row level security;

drop policy if exists "Users can view attachments in accessible projects" on public.task_attachments;
drop policy if exists "Users can create attachments in accessible projects" on public.task_attachments;
drop policy if exists "Users can delete attachments in accessible projects" on public.task_attachments;

create policy "Users can view attachments in accessible projects"
  on public.task_attachments for select
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());

create policy "Users can create attachments in accessible projects"
  on public.task_attachments for insert
  with check (
    (uploaded_by = auth.uid() and public.user_can_access_project(public.project_id_from_task(task_id)))
    or public.is_admin()
  );

create policy "Users can delete attachments in accessible projects"
  on public.task_attachments for delete
  using (public.user_can_access_project(public.project_id_from_task(task_id)) or public.is_admin());

-- Storage policies for task attachments (admin included)
drop policy if exists "Users can read task attachments" on storage.objects;
drop policy if exists "Users can upload task attachments" on storage.objects;
drop policy if exists "Users can delete task attachments" on storage.objects;

create policy "Users can read task attachments"
  on storage.objects for select
  using (
    bucket_id = 'task-attachments'
    and (
      public.user_can_access_project(public.project_id_from_task((split_part(name, '/', 1))::uuid))
      or public.is_admin()
    )
  );

create policy "Users can upload task attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'task-attachments'
    and (
      (
        auth.uid() = owner
        and public.user_can_access_project(public.project_id_from_task((split_part(name, '/', 1))::uuid))
      )
      or public.is_admin()
    )
  );

create policy "Users can delete task attachments"
  on storage.objects for delete
  using (
    bucket_id = 'task-attachments'
    and (
      public.user_can_access_project(public.project_id_from_task((split_part(name, '/', 1))::uuid))
      or public.is_admin()
    )
  );

-- Admin RPCs for users management
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(u.raw_app_meta_data ->> 'role', 'user') as role,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_email text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied';
  end if;

  update auth.users
  set
    email = coalesce(nullif(trim(p_email), ''), email),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', coalesce(nullif(trim(p_role), ''), 'user'))
  where id = p_user_id;
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_user(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
