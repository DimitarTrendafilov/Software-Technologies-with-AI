do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower('mitko@gmail.com')
  order by created_at asc
  limit 1;

  if target_user_id is null then
    raise exception 'User with email % was not found in auth.users', 'mitko@gmail.com';
  end if;

  update public.projects
  set owner_id = target_user_id,
      updated_at = timezone('utc', now())
  where owner_id is distinct from target_user_id;

  insert into public.project_members (project_id, user_id)
  select p.id, target_user_id
  from public.projects p
  where not exists (
    select 1
    from public.project_members pm
    where pm.project_id = p.id
      and pm.user_id = target_user_id
  );
end
$$;