# Taskboard

Taskboard is a Trello-style task management app built with Vanilla JavaScript and Supabase.  
It provides project boards, task stages, labels, comments, deadlines, activity tracking, and project member management.

## Tech Stack

- Frontend: Vite, Vanilla JS (ES modules), Bootstrap 5, HTML/CSS
- Backend: Supabase (Postgres, Auth, RLS)
- Tooling: Supabase CLI, Node.js scripts

## Features

- Authentication with Supabase Auth (email/password)
- Project dashboard and project detail pages
- Kanban-like task workflow with stages (Not Started, In Progress, Done)
- Task metadata: labels, checklists, comments, attachments, deadlines, activity log
- Project members and admin panel support
- Row-Level Security policies for data access control

## Project Structure

```text
src/
  components/      # Shared UI components (header, footer)
  pages/           # Route-driven pages
  services/        # Supabase service layer
  styles/          # Global CSS
  utils/           # Shared utility helpers
supabase/
  migrations/      # SQL migrations
  schema.sql       # Baseline schema snapshot
scripts/
  seed.mjs         # Seed script for sample users/projects/tasks
```

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase project (or local Supabase via Docker)

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` in the project root:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   # Optional for creating users in seed script:
   # SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

## NPM Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run seed` - Seed sample users/projects/tasks
- `npm run db:start` - Start local Supabase stack
- `npm run db:stop` - Stop local Supabase stack
- `npm run db:reset` - Reset local DB and apply migrations
- `npm run db:push` - Push local migrations to linked remote project
- `npm run db:pull` - Pull remote schema changes to local
- `npm run db:sync` - Push, start, reset, and seed in one flow

## Database & Supabase

- SQL migrations are in `supabase/migrations/`
- If using Supabase Cloud, link your project and run:

  ```bash
  npx supabase link --project-ref <your-project-ref>
  npm run db:push
  ```

- For local development with Docker:

  ```bash
  npm run db:start
  npm run db:reset
  npm run seed
  ```

## Sample Seed Accounts

When seeding with service role access, the script creates:

- `steve@gmail.com` / `pass123`
- `maria@gmail.com` / `pass123`
- `peter@gmail.com` / `pass123`

## Main Routes

- `/` - Home
- `/login` - Login
- `/dashboard` - Dashboard
- `/projects` - Project list
- `/projects/:id/tasks` - Project tasks
- `/projects/:id/users` - Project members
- `/projects/:id/labels` - Labels
- `/projects/:id/deadlines` - Deadlines
- `/projects/:id/activity` - Activity feed
- `/admin` - Admin page

## Notes

- App expects Supabase environment variables at runtime.
- RLS policies enforce ownership/membership access on project data.
- If port `5173` is busy, run Vite on another port:

  ```bash
  npm run dev -- --port 5174
  ```