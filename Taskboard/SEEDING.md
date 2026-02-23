# Sample Data Seeding

## Overview

The seed script creates sample users, projects, tasks, and image attachments in your Supabase database for development and testing.

## What Gets Created

### Sample Users

Three users are registered in Supabase Auth:
- `steve@gmail.com` / `123456`
- `maria@gmail.com` / `123456`
- `peter@gmail.com` / `123456`

Each user gets:
- **4 sample projects** with descriptive names and descriptions
- **3 stages per project**: Not Started, In Progress, Done
- **12 tasks per project** distributed across stages:
  - Requirements, design, setup, implementation, review, testing, documentation, deployment, launch, support, optimization, security
- **Image attachments**: The last 5 tasks of the last 5 projects automatically get relevant images attached

### Task Images

Images are stored in the `images/` folder and uploaded to Supabase Storage (`task-attachments` bucket). The script intelligently matches images to tasks based on keywords:

- `requirements.jpg` → Requirements and documentation tasks
- `design.jpg` → Design and mockup tasks
- `development.jpg` → Development environment and setup tasks
- `features.jpg` → Feature implementation tasks
- `testing.jpg` → Testing and QA tasks
- `documentation.jpg` → Documentation writing tasks
- `deployment.jpg` → Deployment and infrastructure tasks
- `monitoring.jpg` → Launch, monitoring, and support tasks
- `performance.jpg` → Performance optimization tasks
- `security.jpg` → Security audit tasks

## Prerequisites

1. Your Supabase project must be set up and running
2. The database schema must be applied (see `DATABASE_SCHEMA.md`)
3. Environment variables must be configured in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Optional: Admin Operations

To use the script's user registration features (creating auth users), you need:
- **SUPABASE_SERVICE_ROLE_KEY** in your `.env` file

Get it from: Supabase Dashboard → Settings → API → Service role key

Add to `.env`:
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Without it, the script will still create projects/stages/tasks if the users already exist.

## Running the Seed Script

```bash
npm run seed
```

### Download Placeholder Images (Optional)

The seed script will use images from the `images/` folder. If you want to refresh them:

```bash
node scripts/download-images.mjs
```

This downloads placeholder images from Lorem Picsum for each task type.

### Bulk seeding for scalability tests

Generate larger datasets with CLI options:

```bash
npm run seed -- --projects 120 --tasks 120
```

Options:
- `--projects` / `-p`: projects per selected user (default: `4`)
- `--tasks` / `-t`: tasks per project (default: `12`)
- `--users` / `-u`: comma-separated sample user emails (default: all sample users)

Example for one user only:

```bash
npm run seed -- --projects 120 --tasks 120 --users steve@gmail.com
```

This will:
1. Ensure the `task-attachments` storage bucket exists
2. Register (or verify) the sample users
3. Create projects, stages, and tasks for each user
4. Attach images to the last 5 tasks of the last 5 projects
5. Print sample login credentials

## Example Output

```
🌱 Seeding Taskboard database...

1️⃣  Ensuring storage bucket exists...
  ✓ Created bucket: task-attachments

2️⃣  Registering sample users...
   Settings: 5 projects/user, 10 tasks/project, users=steve@gmail.com
  ✓ Registered steve@gmail.com

3️⃣  Creating projects, stages, and tasks...

  User: steve@gmail.com
    ✓ Created project: Website Redesign
      ✓ Created 3 stages
      ✓ Created 10 tasks
    ✓ Created project: Mobile App Development
      ✓ Created 3 stages
      ✓ Created 10 tasks
    ...

4️⃣  Attaching images to recent tasks...

  User: steve@gmail.com

  Project: Website Redesign
    Attaching images to 5 tasks...
      ✓ Attached image to: Testing and QA
      ✓ Attached image to: Documentation
      ✓ Attached image to: Deployment preparation
      ✓ Attached image to: Launch and monitoring
      ✓ Attached image to: Post-launch support

  Total images attached: 25

✅ Seeding complete!

Sample login credentials:
  • steve@gmail.com / 123456
  • maria@gmail.com / 123456
  • peter@gmail.com / 123456
```

## Resetting Data

To clear all sample data and start fresh:

```bash
npm run db:reset
npm run seed
```

This will reset the local database to schema and re-seed with fresh sample data.

## Notes

- Tasks are distributed across stages randomly
- 70% of tasks in the "Done" stage are marked as completed
- Each project gets the same stages and task types for consistency
- The script is idempotent - running it multiple times is safe
