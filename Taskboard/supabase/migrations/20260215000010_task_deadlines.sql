-- Add task deadlines

alter table public.tasks
add column if not exists due_date date;

create index if not exists idx_tasks_due_date on public.tasks(due_date);
