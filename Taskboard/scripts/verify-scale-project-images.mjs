#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const targetProjectTitles = Array.from({ length: 11 }, (_, index) =>
  `Scale Test Project ${String(index + 110).padStart(3, '0')}`
);

async function countAttachmentsForProject(projectId) {
  const { data: stages, error: stagesError } = await supabase
    .from('project_stages')
    .select('id')
    .eq('project_id', projectId);

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  const stageIds = (stages || []).map((stage) => stage.id);
  if (!stageIds.length) {
    return 0;
  }

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .in('stage_id', stageIds);

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const taskIds = (tasks || []).map((task) => task.id);
  if (!taskIds.length) {
    return 0;
  }

  const { count, error: attachmentsError } = await supabase
    .from('task_attachments')
    .select('id', { count: 'exact', head: true })
    .in('task_id', taskIds);

  if (attachmentsError) {
    throw new Error(attachmentsError.message);
  }

  return count || 0;
}

async function main() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title')
    .in('title', targetProjectTitles)
    .order('title', { ascending: true });

  if (error) {
    console.error(`Failed to fetch projects: ${error.message}`);
    process.exit(1);
  }

  const found = new Set((projects || []).map((project) => project.title));
  const missing = targetProjectTitles.filter((title) => !found.has(title));

  if (missing.length) {
    console.log('Missing projects:');
    missing.forEach((title) => console.log(`  - ${title}`));
    console.log('');
  }

  for (const project of projects || []) {
    const count = await countAttachmentsForProject(project.id);
    console.log(`${project.title}: ${count} attachments`);
  }
}

main().catch((error) => {
  console.error(`Verification failed: ${error.message}`);
  process.exit(1);
});
