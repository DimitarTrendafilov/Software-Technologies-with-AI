#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing env');
  process.exit(1);
}

const client = createClient(supabaseUrl, anonKey);

async function main() {
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: 'maria@gmail.com',
    password: '123456'
  });

  if (signInError) throw signInError;

  const userId = signInData.user.id;

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select('id,title,owner_id');

  if (projectsError) throw projectsError;

  const ownProjects = (projects ?? []).filter((p) => p.owner_id === userId);

  let tasks = [];
  if (ownProjects.length > 0) {
    const projectIds = ownProjects.map((p) => p.id);
    const { data: stages, error: stagesError } = await client
      .from('project_stages')
      .select('id')
      .in('project_id', projectIds);

    if (stagesError) throw stagesError;

    const stageIds = (stages ?? []).map((s) => s.id);

    if (stageIds.length > 0) {
      const { data: tasksData, error: tasksError } = await client
        .from('tasks')
        .select('id,done')
        .in('stage_id', stageIds);

      if (tasksError) throw tasksError;
      tasks = tasksData ?? [];
    }
  }

  const done = tasks.filter((t) => t.done).length;
  const open = tasks.length - done;

  console.log(`user=${signInData.user.email}`);
  console.log(`projects_visible=${ownProjects.length}`);
  console.log(`tasks_visible=${tasks.length}`);
  console.log(`tasks_open=${open}`);
  console.log(`tasks_done=${done}`);

  await client.auth.signOut();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
