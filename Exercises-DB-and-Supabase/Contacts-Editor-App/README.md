# Contactbook App

## Setup
1. Open [config.js](config.js) and replace `YOUR_SUPABASE_URL_HERE` and `YOUR_SUPABASE_ANON_KEY_HERE` with your Supabase project credentials.
2. Open [index.html](index.html) in a browser.

## Notes
- The Supabase table must be named `contacts` with columns: `id`, `name`, `phone`, `email`, `comments`.
- The app stores **town** together with **comments** in the `comments` column as JSON.
