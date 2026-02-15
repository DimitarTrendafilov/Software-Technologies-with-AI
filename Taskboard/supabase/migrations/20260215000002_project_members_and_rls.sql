-- Add project members and update RLS to allow owner/member access

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists idx_project_members_project_id on public.project_members(project_id);
create index if not exists idx_project_members_user_id on public.project_members(user_id);

create or replace function public.user_can_access_project(check_project_id uuid)
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
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  );
$$;

-- Keep ownership helper explicit for owner-only actions
create or replace function public.user_owns_project(check_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = check_project_id and owner_id = auth.uid()
  );
$$;

create or replace function public.list_app_users(search_query text default '')
returns table (id uuid, email text)
language sql
security definer
set search_path = public, auth
stable
as $$
  select u.id, u.email::text
  from auth.users u
  where u.email is not null
    and (
      coalesce(search_query, '') = ''
      or u.email ilike ('%' || search_query || '%')
    )
  order by u.email asc
  limit 200;
$$;

create or replace function public.list_project_users(check_project_id uuid)
returns table (
  user_id uuid,
  email text,
  is_owner boolean,
  assigned_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select p.owner_id as user_id,
         owner_user.email::text as email,
         true as is_owner,
         p.created_at as assigned_at
  from public.projects p
  join auth.users owner_user on owner_user.id = p.owner_id
  where p.id = check_project_id
    and public.user_can_access_project(check_project_id)

  union all

  select pm.user_id,
         member_user.email::text as email,
         false as is_owner,
         pm.created_at as assigned_at
  from public.project_members pm
  join auth.users member_user on member_user.id = pm.user_id
  where pm.project_id = check_project_id
    and public.user_can_access_project(check_project_id)
  order by is_owner desc, email asc;
$$;

revoke all on function public.list_app_users(text) from public;
revoke all on function public.list_project_users(uuid) from public;
grant execute on function public.list_app_users(text) to authenticated;
grant execute on function public.list_project_users(uuid) to authenticated;

alter table public.project_members enable row level security;

-- Project members policies
create policy "Users can view members of accessible projects"
  on public.project_members for select
  using (public.user_can_access_project(project_id));

create policy "Project owners can add members"
  on public.project_members for insert
  with check (
    public.user_owns_project(project_id)
    and user_id <> auth.uid()
  );

create policy "Project owners can remove members"
  on public.project_members for delete
  using (public.user_owns_project(project_id));

-- Replace project policies (view by owner/member, owner-only write)
drop policy if exists "Users can view their own projects" on public.projects;
drop policy if exists "Users can create projects" on public.projects;
drop policy if exists "Users can update their own projects" on public.projects;
drop policy if exists "Users can delete their own projects" on public.projects;

create policy "Users can view accessible projects"
  on public.projects for select
  using (public.user_can_access_project(id));

create policy "Users can create projects"
  on public.projects for insert
  with check (owner_id = auth.uid());

create policy "Project owners can update projects"
  on public.projects for update
  using (public.user_owns_project(id))
  with check (public.user_owns_project(id));

create policy "Project owners can delete projects"
  on public.projects for delete
  using (public.user_owns_project(id));

-- Replace stages policies (owner/member access)
drop policy if exists "Users can view stages of their projects" on public.project_stages;
drop policy if exists "Users can create stages in their projects" on public.project_stages;
drop policy if exists "Users can update stages in their projects" on public.project_stages;
drop policy if exists "Users can delete stages in their projects" on public.project_stages;

create policy "Users can view stages of accessible projects"
  on public.project_stages for select
  using (public.user_can_access_project(project_id));

create policy "Users can create stages in accessible projects"
  on public.project_stages for insert
  with check (public.user_can_access_project(project_id));

create policy "Users can update stages in accessible projects"
  on public.project_stages for update
  using (public.user_can_access_project(project_id))
  with check (public.user_can_access_project(project_id));

create policy "Users can delete stages in accessible projects"
  on public.project_stages for delete
  using (public.user_can_access_project(project_id));

-- Replace tasks policies (owner/member access)
drop policy if exists "Users can view tasks in their projects" on public.tasks;
drop policy if exists "Users can create tasks in their projects" on public.tasks;
drop policy if exists "Users can update tasks in their projects" on public.tasks;
drop policy if exists "Users can delete tasks in their projects" on public.tasks;

drop policy if exists "Users can view tasks in accessible projects" on public.tasks;
drop policy if exists "Users can create tasks in accessible projects" on public.tasks;
drop policy if exists "Users can update tasks in accessible projects" on public.tasks;
drop policy if exists "Users can delete tasks in accessible projects" on public.tasks;

create policy "Users can view tasks in accessible projects"
  on public.tasks for select
  using (public.user_can_access_project(public.project_id_from_stage(stage_id)));

create policy "Users can create tasks in accessible projects"
  on public.tasks for insert
  with check (public.user_can_access_project(public.project_id_from_stage(stage_id)));

create policy "Users can update tasks in accessible projects"
  on public.tasks for update
  using (public.user_can_access_project(public.project_id_from_stage(stage_id)))
  with check (public.user_can_access_project(public.project_id_from_stage(stage_id)));

create policy "Users can delete tasks in accessible projects"
  on public.tasks for delete
  using (public.user_can_access_project(public.project_id_from_stage(stage_id)));
