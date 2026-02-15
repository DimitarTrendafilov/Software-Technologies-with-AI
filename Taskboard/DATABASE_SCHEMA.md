# Database Schema Setup

## Current Schema

The migration in `supabase/migrations/20260215000000_initial_schema.sql` includes:

### Tables
- **projects**: id, title, description, owner_id, created_at, updated_at
- **project_stages**: id, project_id, name, position, created_at
- **tasks**: id, stage_id, title, description, position, done, created_at, updated_at

### Relationships
- project_stages → projects (cascade delete)
- tasks → project_stages (cascade delete)

### RLS Policies
All tables have Row-Level Security enabled:
- **Projects**: Users can only view/edit/delete their own projects (owner_id = auth.uid())
- **Project Stages**: Users can only access stages of projects they own
- **Tasks**: Users can only access tasks in projects they own

Helper functions:
- `user_owns_project(project_id)` — checks if current user owns a project
- `project_id_from_stage(stage_id)` — gets project_id from stage_id
- `project_id_from_task(task_id)` — gets project_id from task_id

## Apply the Schema

### Option 1: SQL Editor (Recommended)

1. Go to your Supabase project → **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/20260215000000_initial_schema.sql`
4. Paste and run

### Option 2: Supabase CLI (After Authentication)

Once you have set up Supabase CLI authentication:

```bash
npx supabase link --project-ref rvdhwwmrhrznxtnaobsn
npx supabase db push
```

## After Schema is Applied

Once the schema is live in your Supabase project, you can pull it back to local migrations:

```bash
npx supabase db pull
```

This will create or update local migration files with the remote schema.

## Service Layer Integration

Once the schema is live, update `src/services/projects.js` and `src/services/tasks.js` to call the new tables and RLS-protected endpoints.

Example:
```javascript
import { supabase } from './supabase.js';

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, description, created_at')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}
```
