# Taskboard: Trello-style task management app

## Brief project description
Taskboard is a Trello-style task management application. Users create boards, lists, and cards to organize work and collaborate. The app uses a single-page web UI with a Supabase-backed API for data storage and auth.

## Architecture and technology stack
- Frontend: Vanilla JavaScript (ES modules), HTML, CSS.
- Backend: Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js`.
- Data model: Boards, lists, cards, labels, comments, members, and activity events.
- Hosting: static site hosting for the frontend; Supabase handles backend services.

## UI guidelines
- Layout follows a board -> lists -> cards hierarchy.
- Use clean, minimal styling with consistent spacing and card affordances.
- Provide clear visual states for drag, hover, and empty lists.
- Keep forms compact; validate and show errors inline.

## Pages and navigation guidelines
- Pages: Login, Sign up, Boards list, Board detail, Profile/Settings.
- Default route goes to Boards list if authenticated; otherwise Login.
- Board detail route includes board id and renders lists and cards.
- Keep navigation simple: top bar with app name, board switcher, user menu.

## Backend and database guidelines
- Use Supabase tables for boards, lists, cards, labels, comments, and memberships.
- Enforce ownership and membership via row-level security (RLS).
- Prefer server-side filters (Supabase query) over client-side filtering.
- Use timestamps for created/updated and maintain ordering fields for lists/cards.

## Authentication and authorization guidelines
- Use Supabase Auth for email/password sign-in.
- Protect all data with RLS policies; never rely on client-only checks.
- Only board members can read/write board data.
- Owners can manage memberships and delete boards.
