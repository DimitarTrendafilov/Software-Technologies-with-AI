#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const emails = ['steve@gmail.com', 'maria@gmail.com', 'peter@gmail.com'];

async function main() {
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;

  for (const email of emails) {
    const user = usersData.users.find((u) => u.email === email);
    if (!user) {
      console.log(`${email}: missing user`);
      continue;
    }

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('owner_id', user.id);

    if (projectsError) throw projectsError;

    const projectIds = (projects ?? []).map((p) => p.id);

    let stages = [];
    if (projectIds.length > 0) {
      const { data: stagesData, error: stagesError } = await supabase
        .from('project_stages')
        .select('id')
        .in('project_id', projectIds);
      if (stagesError) throw stagesError;
      stages = stagesData ?? [];
    }

    const stageIds = stages.map((s) => s.id);

    let tasks = [];
    if (stageIds.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .in('stage_id', stageIds);
      if (tasksError) throw tasksError;
      tasks = tasksData ?? [];
    }

    console.log(`${email}: projects=${projects.length}, stages=${stages.length}, tasks=${tasks.length}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
