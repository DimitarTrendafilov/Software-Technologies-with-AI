# Supabase Setup Guide

## Environment Variables

Copy your Supabase credentials to `.env`:

```env
VITE_SUPABASE_URL=https://rvdhwwmrhrznxtnaobsn.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

See `.env.example` for the template.

## Database Schema

Run the SQL in `supabase/schema.sql` via the Supabase dashboard SQL editor to create:
- `boards` — user boards
- `lists` — board lists
- `cards` — list cards
- `labels` — card labels
- `card_labels` — label assignments
- `comments` — card comments
- `memberships` — board member permissions
- `activity_events` — audit log

All tables have RLS policies enforcing board membership.

## Local Development (Optional)

If you have Docker, run a local Supabase stack:

```bash
npm run db:start
npm run db:reset  # Apply schema.sql locally
```

Then point `.env` to `http://localhost:54321`.

## VS Code Integration

1. **Supabase Extension** — already installed (`zernonia.supabase-vscode`)
2. Open Command Palette → "Supabase: Connect"
3. Enter your Project URL and anon key (from `.env`)
4. Browse tables, run queries, and manage data from VS Code

## Supabase CLI

Available commands:
- `npm run db:start` — Start local stack
- `npm run db:stop` — Stop local stack
- `npm run db:reset` — Reset local DB to schema
- `npm run db:push` — Sync local migrations to remote
- `npm run db:pull` — Fetch remote schema changes

For more: `npx supabase --help`
