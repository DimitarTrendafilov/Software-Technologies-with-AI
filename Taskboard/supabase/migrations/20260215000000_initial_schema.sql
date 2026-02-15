-- Simplified Taskboard schema: Projects, Stages, Tasks
-- RLS: Users can only access their own projects and nested data

-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project stages table
create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.project_stages(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_project_stages_project_id on public.project_stages(project_id);
create index if not exists idx_tasks_stage_id on public.tasks(stage_id);

-- Updated at trigger for projects
create or replace function public.set_projects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_set_projects_updated_at
before update on public.projects
for each row execute function public.set_projects_updated_at();

-- Updated at trigger for tasks
create or replace function public.set_tasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_tasks_updated_at();

-- Helper function to check if user owns a project
create or replace function public.user_owns_project(check_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.projects
    where id = check_project_id and owner_id = auth.uid()
  );
$$;

-- Helper function to get project_id from stage_id
create or replace function public.project_id_from_stage(check_stage_id uuid)
returns uuid
language sql
stable
as $$
  select project_id from public.project_stages where id = check_stage_id;
$$;

-- Helper function to get project_id from task_id
create or replace function public.project_id_from_task(check_task_id uuid)
returns uuid
language sql
stable
as $$
  select ps.project_id
  from public.tasks t
  join public.project_stages ps on ps.id = t.stage_id
  where t.id = check_task_id;
$$;

-- Enable RLS on all tables
alter table public.projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.tasks enable row level security;

-- RLS policies for projects
create policy "Users can view their own projects"
  on public.projects for select
  using (owner_id = auth.uid());

create policy "Users can create projects"
  on public.projects for insert
  with check (owner_id = auth.uid());

create policy "Users can update their own projects"
  on public.projects for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can delete their own projects"
  on public.projects for delete
  using (owner_id = auth.uid());

-- RLS policies for project_stages
create policy "Users can view stages of their projects"
  on public.project_stages for select
  using (public.user_owns_project(project_id));

create policy "Users can create stages in their projects"
  on public.project_stages for insert
  with check (public.user_owns_project(project_id));

create policy "Users can update stages in their projects"
  on public.project_stages for update
  using (public.user_owns_project(project_id))
  with check (public.user_owns_project(project_id));

create policy "Users can delete stages in their projects"
  on public.project_stages for delete
  using (public.user_owns_project(project_id));

-- RLS policies for tasks
create policy "Users can view tasks in their projects"
  on public.tasks for select
  using (
    public.user_owns_project(
      public.project_id_from_task(id)
    )
  );

create policy "Users can create tasks in their projects"
  on public.tasks for insert
  with check (
    public.user_owns_project(
      public.project_id_from_task(id)
    )
  );

create policy "Users can update tasks in their projects"
  on public.tasks for update
  using (
    public.user_owns_project(
      public.project_id_from_task(id)
    )
  )
  with check (
    public.user_owns_project(
      public.project_id_from_task(id)
    )
  );

create policy "Users can delete tasks in their projects"
  on public.tasks for delete
  using (
    public.user_owns_project(
      public.project_id_from_task(id)
    )
  );
