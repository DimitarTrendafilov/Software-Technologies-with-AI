-- Project summaries for paged projects table

create or replace function public.get_project_summaries(project_ids uuid[])
returns table (
  project_id uuid,
  stages_count bigint,
  open_tasks bigint,
  done_tasks bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as project_id,
    count(distinct ps.id)::bigint as stages_count,
    coalesce(count(t.id) filter (where t.done = false), 0)::bigint as open_tasks,
    coalesce(count(t.id) filter (where t.done = true), 0)::bigint as done_tasks
  from public.projects p
  left join public.project_stages ps on ps.project_id = p.id
  left join public.tasks t on t.stage_id = ps.id
  where p.id = any(project_ids)
    and (public.user_can_access_project(p.id) or public.is_admin())
  group by p.id;
$$;

grant execute on function public.get_project_summaries(uuid[]) to authenticated;
