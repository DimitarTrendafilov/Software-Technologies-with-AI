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

function parseArgs(argv) {
  const args = {
    projectsPerUser: 4,
    tasksPerProject: 12,
    users: sampleUsers.map((user) => user.email)
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === '--projects' || entry === '-p') {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isInteger(value) && value > 0) {
        args.projectsPerUser = value;
      }
      index += 1;
    } else if (entry === '--tasks' || entry === '-t') {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isInteger(value) && value > 0) {
        args.tasksPerProject = value;
      }
      index += 1;
    } else if (entry === '--users' || entry === '-u') {
      const value = String(argv[index + 1] ?? '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      if (value.length) {
        args.users = value;
      }
      index += 1;
    }
  }

  return args;
}

function buildProjectTemplates(projectsPerUser) {
  if (projectsPerUser <= projectTemplates.length) {
    return projectTemplates.slice(0, projectsPerUser);
  }

  return Array.from({ length: projectsPerUser }, (_, index) => ({
    title: `Scale Test Project ${String(index + 1).padStart(3, '0')}`,
    description: `Large dataset project ${index + 1} for pagination and performance verification`
  }));
}

function buildTasksForProject(tasksPerProject, stages) {
  return Array.from({ length: tasksPerProject }, (_, index) => {
    const template = taskTemplates[index % taskTemplates.length];
    const stageIndex = index % stages.length;
    const stage = stages[stageIndex];

    return {
      stage_id: stage.id,
      title: tasksPerProject <= taskTemplates.length ? template.title : `${template.title} #${index + 1}`,
      description: template.description,
      position: Math.floor(index / stages.length),
      done: stageIndex === 2 && Math.random() > 0.3
    };
  });
}

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

async function createProjectsAndTasks(userId, { projectsPerUser, tasksPerProject }) {
  try {
    const generatedProjects = buildProjectTemplates(projectsPerUser);

    for (const projectTemplate of generatedProjects) {
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

      const tasks = buildTasksForProject(tasksPerProject, stages);
      const { error: tasksError } = await supabase.from('tasks').insert(tasks);
      if (tasksError) {
        throw tasksError;
      }

      console.log(`      ✓ Created ${tasks.length} tasks`);
    }
  } catch (error) {
    console.error(`  ✗ Failed to create projects:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('\n🌱 Seeding Taskboard database...\n');
  const options = parseArgs(process.argv.slice(2));
  const selectedUsers = sampleUsers.filter((user) => options.users.includes(user.email.toLowerCase()));

  if (!selectedUsers.length) {
    console.error('❌ No valid users selected. Use --users with one or more sample emails.');
    process.exit(1);
  }

  try {
    console.log('1️⃣  Registering sample users...');
    console.log(
      `   Settings: ${options.projectsPerUser} projects/user, ${options.tasksPerProject} tasks/project, users=${selectedUsers
        .map((user) => user.email)
        .join(', ')}`
    );
    const userIds = {};

    for (const user of selectedUsers) {
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

      await createProjectsAndTasks(userId, options);
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
