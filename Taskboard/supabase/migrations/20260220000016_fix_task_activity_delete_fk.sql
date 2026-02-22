-- Avoid FK violations when logging task deletions

create or replace function public.task_activity_on_task_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
begin
  project_id := public.project_id_from_stage(old.stage_id);
  perform public.log_task_activity(
    project_id,
    null,
    old.title,
    'task_deleted',
    jsonb_build_object('stage_id', old.stage_id, 'deleted_task_id', old.id)
  );
  return old;
end;
$$;
