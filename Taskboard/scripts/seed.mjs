#!/usr/bin/env node

// Load environment variables from .env
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root
const envPath = resolve(__dirname, '..', '.env');
try {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn(`Warning: Could not load .env file from ${envPath}`);
  }
} catch (err) {
  console.warn(`Warning: Could not load .env file: ${err.message}`);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const sampleUsers = [
  { email: 'steve@gmail.com', password: '123456' },
  { email: 'maria@gmail.com', password: '123456' },
  { email: 'peter@gmail.com', password: '123456' }
];

const projectTemplates = [
  { title: 'Website Redesign', description: 'Complete overhaul of company website with new branding' },
  { title: 'Mobile App Development', description: 'Build iOS and Android native mobile apps' },
  { title: 'API Infrastructure', description: 'Modernize backend API with microservices' },
  { title: 'Marketing Campaign', description: 'Q2 marketing initiative and brand awareness' }
];

const stageNames = ['Not Started', 'In Progress', 'Done'];

const taskTemplates = [
  { title: 'Write requirements document', description: 'Detailed specification and acceptance criteria' },
  { title: 'Design mockups', description: 'Create wireframes and UI designs' },
  { title: 'Setup development environment', description: 'Configure tools, dependencies, and CI/CD' },
  { title: 'Implement core features', description: 'Build the main functionality' },
  { title: 'Code review', description: 'Peer review and quality assurance' },
  { title: 'Testing and QA', description: 'Functional, integration, and performance testing' },
  { title: 'Documentation', description: 'Write API docs, user guides, and technical docs' },
  { title: 'Deployment preparation', description: 'Pre-production checklist and deployment plan' },
  { title: 'Launch and monitoring', description: 'Deploy to production and monitor metrics' },
  { title: 'Post-launch support', description: 'Handle bugs and user feedback' },
  { title: 'Performance optimization', description: 'Improve load time and resource usage' },
  { title: 'Security audit', description: 'Identify and fix security vulnerabilities' }
];

async function registerUser(email, password) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        console.log(`  ✓ User ${email} already exists`);
        const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
        const user = userData?.users?.find((u) => u.email === email);
        return user?.id;
      }
      throw error;
    }

    console.log(`  ✓ Registered ${email}`);
    return data.user.id;
  } catch (error) {
    console.error(`  ✗ Failed to register ${email}:`, error.message);
    throw error;
  }
}

async function createProjectsAndTasks(userId) {
  try {
    for (const projectTemplate of projectTemplates) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectTemplate.title,
          description: projectTemplate.description,
          owner_id: userId
        })
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }

      console.log(`    ✓ Created project: ${project.title}`);

      const stages = [];
      for (let i = 0; i < stageNames.length; i++) {
        const { data: stage, error: stageError } = await supabase
          .from('project_stages')
          .insert({
            project_id: project.id,
            name: stageNames[i],
            position: i
          })
          .select()
          .single();

        if (stageError) {
          throw stageError;
        }

        stages.push(stage);
      }

      console.log(`      ✓ Created ${stages.length} stages`);

      let taskCount = 0;
      for (let i = 0; i < taskTemplates.length; i++) {
        const stageIndex = i % stages.length;
        const stage = stages[stageIndex];
        const task = taskTemplates[i];

        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            stage_id: stage.id,
            title: task.title,
            description: task.description,
            position: Math.floor(i / stages.length),
            done: stageIndex === 2 && Math.random() > 0.3
          });

        if (taskError) {
          throw taskError;
        }

        taskCount++;
      }

      console.log(`      ✓ Created ${taskCount} tasks`);
    }
  } catch (error) {
    console.error(`  ✗ Failed to create projects:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('\n🌱 Seeding Taskboard database...\n');

  try {
    console.log('1️⃣  Registering sample users...');
    const userIds = {};

    for (const user of sampleUsers) {
      try {
        userIds[user.email] = await registerUser(user.email, user.password);
      } catch (error) {
        console.error(`  ✗ Skipping ${user.email}: ${error.message}`);
        continue;
      }
    }

    console.log('\n2️⃣  Creating projects, stages, and tasks...');

    for (const email of Object.keys(userIds)) {
      const userId = userIds[email];
      console.log(`\n  User: ${email}`);

      await createProjectsAndTasks(userId);
    }

    console.log('\n✅ Seeding complete!\n');
    console.log('Sample login credentials:');
    sampleUsers.forEach((user) => {
      console.log(`  • ${user.email} / ${user.password}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

main();
