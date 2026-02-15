-- Task activity logs

create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  task_title text,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_activity_project_id on public.task_activity(project_id);
create index if not exists idx_task_activity_task_id on public.task_activity(task_id);
create index if not exists idx_task_activity_created_at on public.task_activity(created_at desc);

alter table public.task_activity enable row level security;

create policy "Users can view activity in accessible projects"
  on public.task_activity for select
  using (public.user_can_access_project(project_id) or public.is_admin());

create or replace function public.project_and_title_from_task(check_task_id uuid)
returns table (
  project_id uuid,
  task_title text
)
language sql
stable
set search_path = public
as $$
  select ps.project_id, t.title
  from public.tasks t
  join public.project_stages ps on ps.id = t.stage_id
  where t.id = check_task_id;
$$;

create or replace function public.log_task_activity(
  p_project_id uuid,
  p_task_id uuid,
  p_task_title text,
  p_action text,
  p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_activity(project_id, task_id, task_title, actor_id, action, details)
  values (
    p_project_id,
    p_task_id,
    p_task_title,
    auth.uid(),
    p_action,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function public.task_activity_on_task_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
begin
  project_id := public.project_id_from_stage(new.stage_id);
  perform public.log_task_activity(
    project_id,
    new.id,
    new.title,
    'task_created',
    jsonb_build_object(
      'stage_id', new.stage_id,
      'assignee_id', new.assignee_id,
      'due_date', new.due_date
    )
  );
  return new;
end;
$$;

create or replace function public.task_activity_on_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_id uuid;
  changes jsonb := '[]'::jsonb;
begin
  if new.title is distinct from old.title then
    changes := changes || jsonb_build_object('field', 'title', 'old', old.title, 'new', new.title);
  end if;
  if new.description is distinct from old.description then
    changes := changes || jsonb_build_object('field', 'description', 'old', old.description, 'new', new.description);
  end if;
  if new.done is distinct from old.done then
    changes := changes || jsonb_build_object('field', 'done', 'old', old.done, 'new', new.done);
  end if;
  if new.stage_id is distinct from old.stage_id then
    changes := changes || jsonb_build_object('field', 'stage_id', 'old', old.stage_id, 'new', new.stage_id);
  end if;
  if new.position is distinct from old.position then
    changes := changes || jsonb_build_object('field', 'position', 'old', old.position, 'new', new.position);
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    changes := changes || jsonb_build_object('field', 'assignee_id', 'old', old.assignee_id, 'new', new.assignee_id);
  end if;
  if new.due_date is distinct from old.due_date then
    changes := changes || jsonb_build_object('field', 'due_date', 'old', old.due_date, 'new', new.due_date);
  end if;

  if changes <> '[]'::jsonb then
    project_id := public.project_id_from_stage(new.stage_id);
    perform public.log_task_activity(
      project_id,
      new.id,
      new.title,
      'task_updated',
      jsonb_build_object('changes', changes)
    );
  end if;

  return new;
end;
$$;

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
    old.id,
    old.title,
    'task_deleted',
    jsonb_build_object('stage_id', old.stage_id)
  );
  return old;
end;
$$;

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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(new.task_id);
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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(old.task_id);
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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(new.task_id);
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

  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(new.task_id);
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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(old.task_id);
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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(new.task_id);
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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(old.task_id);
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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(new.task_id);
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
  select project_id, task_title into project_id, task_title
  from public.project_and_title_from_task(old.task_id);
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

-- Triggers

drop trigger if exists task_activity_tasks_insert on public.tasks;
create trigger task_activity_tasks_insert
  after insert on public.tasks
  for each row execute function public.task_activity_on_task_insert();

drop trigger if exists task_activity_tasks_update on public.tasks;
create trigger task_activity_tasks_update
  after update on public.tasks
  for each row execute function public.task_activity_on_task_update();

drop trigger if exists task_activity_tasks_delete on public.tasks;
create trigger task_activity_tasks_delete
  after delete on public.tasks
  for each row execute function public.task_activity_on_task_delete();

drop trigger if exists task_activity_comments_insert on public.task_comments;
create trigger task_activity_comments_insert
  after insert on public.task_comments
  for each row execute function public.task_activity_on_comment_insert();

drop trigger if exists task_activity_comments_delete on public.task_comments;
create trigger task_activity_comments_delete
  after delete on public.task_comments
  for each row execute function public.task_activity_on_comment_delete();

drop trigger if exists task_activity_checklist_insert on public.task_checklist_items;
create trigger task_activity_checklist_insert
  after insert on public.task_checklist_items
  for each row execute function public.task_activity_on_checklist_insert();

drop trigger if exists task_activity_checklist_update on public.task_checklist_items;
create trigger task_activity_checklist_update
  after update on public.task_checklist_items
  for each row execute function public.task_activity_on_checklist_update();

drop trigger if exists task_activity_checklist_delete on public.task_checklist_items;
create trigger task_activity_checklist_delete
  after delete on public.task_checklist_items
  for each row execute function public.task_activity_on_checklist_delete();

drop trigger if exists task_activity_labels_insert on public.task_labels;
create trigger task_activity_labels_insert
  after insert on public.task_labels
  for each row execute function public.task_activity_on_label_insert();

drop trigger if exists task_activity_labels_delete on public.task_labels;
create trigger task_activity_labels_delete
  after delete on public.task_labels
  for each row execute function public.task_activity_on_label_delete();

drop trigger if exists task_activity_attachments_insert on public.task_attachments;
create trigger task_activity_attachments_insert
  after insert on public.task_attachments
  for each row execute function public.task_activity_on_attachment_insert();

drop trigger if exists task_activity_attachments_delete on public.task_attachments;
create trigger task_activity_attachments_delete
  after delete on public.task_attachments
  for each row execute function public.task_activity_on_attachment_delete();
