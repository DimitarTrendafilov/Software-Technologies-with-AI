-- Fix ambiguous project_id reference in task activity triggers

create or replace function public.task_activity_on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(new.task_id) as task_info;
  if project_id is null then
    return new;
  end if;

  perform public.log_task_activity(
    project_id,
    new.task_id,
    task_title,
    'comment_added',
    jsonb_build_object('content', new.content)
  );
  return new;
end;
$$;

create or replace function public.task_activity_on_comment_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(old.task_id) as task_info;
  if project_id is null then
    return old;
  end if;

  perform public.log_task_activity(
    project_id,
    old.task_id,
    task_title,
    'comment_deleted',
    jsonb_build_object('content', old.content)
  );
  return old;
end;
$$;

create or replace function public.task_activity_on_checklist_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(new.task_id) as task_info;
  if project_id is null then
    return new;
  end if;

  perform public.log_task_activity(
    project_id,
    new.task_id,
    task_title,
    'checklist_item_added',
    jsonb_build_object('content', new.content)
  );
  return new;
end;
$$;

create or replace function public.task_activity_on_checklist_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
  changes jsonb := '[]'::jsonb;
begin
  if new.content is distinct from old.content then
    changes := changes || jsonb_build_object('field', 'content', 'old', old.content, 'new', new.content);
  end if;
  if new.is_done is distinct from old.is_done then
    changes := changes || jsonb_build_object('field', 'is_done', 'old', old.is_done, 'new', new.is_done);
  end if;
  if new.position is distinct from old.position then
    changes := changes || jsonb_build_object('field', 'position', 'old', old.position, 'new', new.position);
  end if;

  if changes = '[]'::jsonb then
    return new;
  end if;

  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(new.task_id) as task_info;
  if project_id is null then
    return new;
  end if;

  perform public.log_task_activity(
    project_id,
    new.task_id,
    task_title,
    'checklist_item_updated',
    jsonb_build_object('changes', changes)
  );
  return new;
end;
$$;

create or replace function public.task_activity_on_checklist_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(old.task_id) as task_info;
  if project_id is null then
    return old;
  end if;

  perform public.log_task_activity(
    project_id,
    old.task_id,
    task_title,
    'checklist_item_deleted',
    jsonb_build_object('content', old.content)
  );
  return old;
end;
$$;

create or replace function public.task_activity_on_label_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
  label_name text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(new.task_id) as task_info;
  if project_id is null then
    return new;
  end if;

  select name into label_name from public.labels where id = new.label_id;

  perform public.log_task_activity(
    project_id,
    new.task_id,
    task_title,
    'label_added',
    jsonb_build_object('label_id', new.label_id, 'label_name', label_name)
  );
  return new;
end;
$$;

create or replace function public.task_activity_on_label_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
  label_name text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(old.task_id) as task_info;
  if project_id is null then
    return old;
  end if;

  select name into label_name from public.labels where id = old.label_id;

  perform public.log_task_activity(
    project_id,
    old.task_id,
    task_title,
    'label_removed',
    jsonb_build_object('label_id', old.label_id, 'label_name', label_name)
  );
  return old;
end;
$$;

create or replace function public.task_activity_on_attachment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(new.task_id) as task_info;
  if project_id is null then
    return new;
  end if;

  perform public.log_task_activity(
    project_id,
    new.task_id,
    task_title,
    'attachment_added',
    jsonb_build_object('file_name', new.file_name)
  );
  return new;
end;
$$;

create or replace function public.task_activity_on_attachment_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  task_title text;
begin
  select task_info.project_id, task_info.task_title
  into project_id, task_title
  from public.project_and_title_from_task(old.task_id) as task_info;
  if project_id is null then
    return old;
  end if;

  perform public.log_task_activity(
    project_id,
    old.task_id,
    task_title,
    'attachment_deleted',
    jsonb_build_object('file_name', old.file_name)
  );
  return old;
end;
$$;
