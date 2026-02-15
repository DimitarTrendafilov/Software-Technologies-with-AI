#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, anonKey);

async function main() {
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'maria@gmail.com',
    password: '123456'
  });

  if (signInError) throw signInError;

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select('id,title,owner_id');

  if (projectsError) throw projectsError;

  console.log(`projects_visible=${(projects ?? []).length}`);

  await client.auth.signOut();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
