import { config } from 'dotenv';
import pg from 'pg';
const { Client } = pg;

// Load environment variables  
config();

const projectRef = process.env.VITE_SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from VITE_SUPABASE_URL');
  process.exit(1);
}

console.log('🔧 Applying RLS policy fixes for tasks table...\n');
console.log('⚠️  This script requires the database password.');
console.log('📝 You can find it in your Supabase Dashboard:');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/settings/database\n`);

// Prompt for password (or set SUPABASE_DB_PASSWORD env var)
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.error('❌ Please set SUPABASE_DB_PASSWORD environment variable');
  console.error('   Example: $env:SUPABASE_DB_PASSWORD="your-password" ; node scripts/apply-migration.mjs');
  console.error('\n📋 Alternative: Apply the migration manually via SQL Editor:');
  console.error(`   https://supabase.com/dashboard/project/${projectRef}/editor`);
  console.error('\n   Run this SQL:');
  console.error('   ---');
  console.error('   DROP POLICY IF EXISTS "Users can view tasks in their projects" ON public.tasks;');
  console.error('   DROP POLICY IF EXISTS "Users can create tasks in their projects" ON public.tasks;');
  console.error('   DROP POLICY IF EXISTS "Users can update tasks in their projects" ON public.tasks;');  
  console.error('   DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON public.tasks;');
  console.error('');
  console.error('   CREATE POLICY "Users can view tasks in their projects" ON public.tasks FOR SELECT');
  console.error('     USING (public.user_owns_project(public.project_id_from_stage(stage_id)));');
  console.error('');
  console.error('   CREATE POLICY "Users can create tasks in their projects" ON public.tasks FOR INSERT');
  console.error('     WITH CHECK (public.user_owns_project(public.project_id_from_stage(stage_id)));');
  console.error('');
  console.error('   CREATE POLICY "Users can update tasks in their projects" ON public.tasks FOR UPDATE');
  console.error('     USING (public.user_owns_project(public.project_id_from_stage(stage_id)))');
  console.error('     WITH CHECK (public.user_owns_project(public.project_id_from_stage(stage_id)));');
  console.error('');
  console.error('   CREATE POLICY "Users can delete tasks in their projects" ON public.tasks FOR DELETE');
  console.error('     USING (public.user_owns_project(public.project_id_from_stage(stage_id)));');
  console.error('   ---\n');
  process.exit(1);
}

const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

const sqlStatements = [
  'DROP POLICY IF EXISTS "Users can view tasks in their projects" ON public.tasks',
  'DROP POLICY IF EXISTS "Users can create tasks in their projects" ON public.tasks',
  'DROP POLICY IF EXISTS "Users can update tasks in their projects" ON public.tasks',
  'DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON public.tasks',
  
  `CREATE POLICY "Users can view tasks in their projects" ON public.tasks FOR SELECT
    USING (public.user_owns_project(public.project_id_from_stage(stage_id)))`,
  
  `CREATE POLICY "Users can create tasks in their projects" ON public.tasks FOR INSERT
    WITH CHECK (public.user_owns_project(public.project_id_from_stage(stage_id)))`,
  
  `CREATE POLICY "Users can update tasks in their projects" ON public.tasks FOR UPDATE
    USING (public.user_owns_project(public.project_id_from_stage(stage_id)))
    WITH CHECK (public.user_owns_project(public.project_id_from_stage(stage_id)))`,
  
  `CREATE POLICY "Users can delete tasks in their projects" ON public.tasks FOR DELETE
    USING (public.user_owns_project(public.project_id_from_stage(stage_id)))`
];

async function applyMigration() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      const preview = statement.substring(0, 70).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${sqlStatements.length}] ${preview}...`);
      
      try {
        await client.query(statement);
        console.log('  ✅ Success\n');
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
      }
    }
    
    console.log('✨ Migration completed successfully!');
    console.log('🔄 Please refresh your browser to see the changes.\n');
    
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('\n📋 Please apply the migration manually via SQL Editor.');
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
