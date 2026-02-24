#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const TASK_ATTACHMENTS_BUCKET = 'task-attachments';
const IMAGES_DIR = resolve(__dirname, '..', 'images');
const IMAGES_PER_PROJECT = 5;

const targetProjectTitles = Array.from({ length: 11 }, (_, index) =>
  `Scale Test Project ${String(index + 110).padStart(3, '0')}`
);

const taskImageMap = {
  requirements: 'requirements.jpg',
  design: 'design.jpg',
  mockups: 'design.jpg',
  development: 'development.jpg',
  environment: 'development.jpg',
  features: 'features.jpg',
  implement: 'features.jpg',
  testing: 'testing.jpg',
  qa: 'testing.jpg',
  documentation: 'documentation.jpg',
  deployment: 'deployment.jpg',
  launch: 'monitoring.jpg',
  monitoring: 'monitoring.jpg',
  support: 'monitoring.jpg',
  performance: 'performance.jpg',
  optimization: 'performance.jpg',
  security: 'security.jpg',
  audit: 'security.jpg'
};

function getImageForTask(taskTitle) {
  const titleLower = taskTitle.toLowerCase();

  for (const [keyword, imageName] of Object.entries(taskImageMap)) {
    if (titleLower.includes(keyword)) {
      return imageName;
    }
  }

  return 'features.jpg';
}

async function ensureBucketExists() {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to list storage buckets: ${error.message}`);
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === TASK_ATTACHMENTS_BUCKET);

  if (!bucketExists) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(TASK_ATTACHMENTS_BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024
    });

    if (createError) {
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
}

function selectDistributedTasks(tasks, stages, needed = IMAGES_PER_PROJECT) {
  if (!tasks.length) {
    return [];
  }

  const stageOrder = [...stages].sort((a, b) => a.position - b.position).map((stage) => stage.id);
  const stageQueues = new Map(stageOrder.map((stageId) => [stageId, []]));

  for (const task of tasks) {
    if (!stageQueues.has(task.stage_id)) {
      stageQueues.set(task.stage_id, []);
    }
    stageQueues.get(task.stage_id).push(task);
  }

  for (const queue of stageQueues.values()) {
    queue.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  const selected = [];
  const selectedIds = new Set();

  while (selected.length < needed) {
    let addedThisRound = false;

    for (const stageId of stageOrder) {
      const queue = stageQueues.get(stageId) || [];
      while (queue.length && selectedIds.has(queue[0].id)) {
        queue.shift();
      }
      if (!queue.length) {
        continue;
      }

      const next = queue.shift();
      selected.push(next);
      selectedIds.add(next.id);
      addedThisRound = true;

      if (selected.length >= needed) {
        break;
      }
    }

    if (!addedThisRound) {
      break;
    }
  }

  if (selected.length < needed) {
    for (const task of tasks) {
      if (!selectedIds.has(task.id)) {
        selected.push(task);
        selectedIds.add(task.id);
      }
      if (selected.length >= needed) {
        break;
      }
    }
  }

  return selected.slice(0, needed);
}

async function uploadImageToTask(task, uploadedBy) {
  const imageName = getImageForTask(task.title);
  const imagePath = resolve(IMAGES_DIR, imageName);
  const imageBuffer = readFileSync(imagePath);

  const safeName = imageName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${task.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage.from(TASK_ATTACHMENTS_BUCKET).upload(storagePath, imageBuffer, {
    upsert: false,
    contentType: 'image/jpeg'
  });

  if (uploadError) {
    throw new Error(`Upload failed for task "${task.title}": ${uploadError.message}`);
  }

  const { error: metadataError } = await supabase.from('task_attachments').insert({
    task_id: task.id,
    storage_path: storagePath,
    file_name: imageName,
    mime_type: 'image/jpeg',
    size_bytes: imageBuffer.length,
    uploaded_by: uploadedBy
  });

  if (metadataError) {
    await supabaseAdmin.storage.from(TASK_ATTACHMENTS_BUCKET).remove([storagePath]);
    throw new Error(`Metadata insert failed for task "${task.title}": ${metadataError.message}`);
  }

  return imageName;
}

async function clearProjectAttachments(taskIds, projectTitle) {
  if (!taskIds.length) {
    return 0;
  }

  const { data: existingAttachments, error: existingError } = await supabase
    .from('task_attachments')
    .select('id, storage_path')
    .in('task_id', taskIds);

  if (existingError) {
    throw new Error(`Failed to load existing attachments for ${projectTitle}: ${existingError.message}`);
  }

  if (!existingAttachments?.length) {
    return 0;
  }

  const storagePaths = existingAttachments
    .map((attachment) => attachment.storage_path)
    .filter(Boolean);

  if (storagePaths.length) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      throw new Error(`Failed to remove storage files for ${projectTitle}: ${storageError.message}`);
    }
  }

  const { error: deleteError } = await supabase
    .from('task_attachments')
    .delete()
    .in('id', existingAttachments.map((attachment) => attachment.id));

  if (deleteError) {
    throw new Error(`Failed to remove metadata attachments for ${projectTitle}: ${deleteError.message}`);
  }

  return existingAttachments.length;
}

async function processProject(project) {
  const { data: stages, error: stagesError } = await supabase
    .from('project_stages')
    .select('id, name, position')
    .eq('project_id', project.id)
    .order('position', { ascending: true });

  if (stagesError) {
    throw new Error(`Failed to fetch stages for ${project.title}: ${stagesError.message}`);
  }

  if (!stages?.length) {
    console.log(`  ⚠ ${project.title}: no stages found`);
    return { attached: 0 };
  }

  const stageIds = stages.map((stage) => stage.id);
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, stage_id, position')
    .in('stage_id', stageIds)
    .order('position', { ascending: true });

  if (tasksError) {
    throw new Error(`Failed to fetch tasks for ${project.title}: ${tasksError.message}`);
  }

  if (!tasks?.length) {
    console.log(`  ⚠ ${project.title}: no tasks found`);
    return { attached: 0 };
  }

  const removedCount = await clearProjectAttachments(
    tasks.map((task) => task.id),
    project.title
  );

  if (removedCount > 0) {
    console.log(`    Cleared ${removedCount} old attachment(s)`);
  }

  const selectedTasks = selectDistributedTasks(tasks, stages, Math.min(IMAGES_PER_PROJECT, tasks.length));

  let attached = 0;
  for (const task of selectedTasks) {
    const imageName = await uploadImageToTask(task, project.owner_id);
    attached += 1;
    const stageName = stages.find((stage) => stage.id === task.stage_id)?.name || 'Unknown';
    console.log(`    ✓ ${task.title} [${stageName}] <- ${imageName}`);
  }

  return { attached };
}

async function main() {
  console.log('\n🖼️  Attaching images to Scale Test Projects 110-120...\n');

  try {
    await ensureBucketExists();

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, owner_id')
      .in('title', targetProjectTitles)
      .order('title', { ascending: true });

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    const foundTitles = new Set((projects || []).map((project) => project.title));
    const missing = targetProjectTitles.filter((title) => !foundTitles.has(title));

    if (missing.length) {
      console.log('Missing projects:');
      missing.forEach((title) => console.log(`  - ${title}`));
      console.log('');
    }

    let totalAttached = 0;

    for (const project of projects || []) {
      console.log(`  Project: ${project.title}`);
      const { attached } = await processProject(project);
      totalAttached += attached;
      console.log(`  Attached ${attached} image(s)\n`);
    }

    console.log(`✅ Done. Total new attachments: ${totalAttached}`);
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    process.exit(1);
  }
}

main();
