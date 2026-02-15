-- Fix RLS policies for tasks to avoid stack depth limit
-- Drop existing policies
drop policy if exists "Users can view tasks in their projects" on public.tasks;
drop policy if exists "Users can create tasks in their projects" on public.tasks;
drop policy if exists "Users can update tasks in their projects" on public.tasks;
drop policy if exists "Users can delete tasks in their projects" on public.tasks;

-- Recreate policies using project_id_from_stage instead of project_id_from_task
create policy "Users can view tasks in their projects"
  on public.tasks for select
  using (
    public.user_owns_project(
      public.project_id_from_stage(stage_id)
    )
  );

create policy "Users can create tasks in their projects"
  on public.tasks for insert
  with check (
    public.user_owns_project(
      public.project_id_from_stage(stage_id)
    )
  );

create policy "Users can update tasks in their projects"
  on public.tasks for update
  using (
    public.user_owns_project(
      public.project_id_from_stage(stage_id)
    )
  )
  with check (
    public.user_owns_project(
      public.project_id_from_stage(stage_id)
    )
  );

create policy "Users can delete tasks in their projects"
  on public.tasks for delete
  using (
    public.user_owns_project(
      public.project_id_from_stage(stage_id)
    )
  );
