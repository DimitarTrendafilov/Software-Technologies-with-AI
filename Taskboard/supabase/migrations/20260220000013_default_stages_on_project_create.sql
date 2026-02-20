-- Ensure every project has default stages

create or replace function public.create_default_project_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.project_stages
    where project_id = new.id
  ) then
    insert into public.project_stages (project_id, name, position)
    values
      (new.id, 'To Do', 0),
      (new.id, 'In Progress', 1),
      (new.id, 'Done', 2);
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_create_default_project_stages on public.projects;

create trigger trigger_create_default_project_stages
after insert on public.projects
for each row execute function public.create_default_project_stages();

-- Backfill projects created before this migration that still have no stages
insert into public.project_stages (project_id, name, position)
select p.id, stage_def.name, stage_def.position
from public.projects p
cross join (
  values
    ('To Do'::text, 0),
    ('In Progress'::text, 1),
    ('Done'::text, 2)
) as stage_def(name, position)
where not exists (
  select 1
  from public.project_stages ps
  where ps.project_id = p.id
);
