-- Ensure project owners are also members to satisfy membership-only access patterns

create or replace function public.ensure_owner_project_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trigger_ensure_owner_project_membership on public.projects;

create trigger trigger_ensure_owner_project_membership
after insert on public.projects
for each row execute function public.ensure_owner_project_membership();

-- Backfill owner memberships for existing projects
insert into public.project_members (project_id, user_id)
select p.id, p.owner_id
from public.projects p
where not exists (
  select 1
  from public.project_members pm
  where pm.project_id = p.id
    and pm.user_id = p.owner_id
);

-- Avoid duplicate owners in list_project_users results
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
    and pm.user_id <> (select owner_id from public.projects where id = check_project_id)
    and public.user_can_access_project(check_project_id)
  order by is_owner desc, email asc;
$$;

revoke all on function public.list_project_users(uuid) from public;
grant execute on function public.list_project_users(uuid) to authenticated;
