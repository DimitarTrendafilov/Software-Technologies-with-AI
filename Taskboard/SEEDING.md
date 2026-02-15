# Sample Data Seeding

## Overview

The seed script creates sample users and data in your Supabase database for development and testing.

## What Gets Created

### Sample Users

Three users are registered in Supabase Auth:
- `steve@gmail.com` / `pass123`
- `maria@gmail.com` / `pass123`
- `peter@gmail.com` / `pass123`

Each user gets:
- **4 sample projects** with descriptive names and descriptions
- **3 stages per project**: Not Started, In Progress, Done
- **12 tasks per project** distributed across stages:
  - Requirements, design, setup, implementation, review, testing, documentation, deployment, launch, support, optimization, security

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
1. Register (or verify) the three sample users
2. Create projects, stages, and tasks for each user
3. Print sample login credentials

## Example Output

```
🌱 Seeding Taskboard database...

1️⃣  Registering sample users...
  ✓ Registered steve@gmail.com
  ✓ Registered maria@gmail.com
  ✓ Registered peter@gmail.com

2️⃣  Creating projects, stages, and tasks...

  User: steve@gmail.com
    ✓ Created project: Website Redesign
      ✓ Created 3 stages
      ✓ Created 12 tasks
    ✓ Created project: Mobile App Development
    ...

✅ Seeding complete!

Sample login credentials:
  • steve@gmail.com / pass123
  • maria@gmail.com / pass123
  • peter@gmail.com / pass123
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
