import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = supabaseUrl?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔧 Applying RLS policy fixes...\n');

async function dropAndRecreatePolicy(policyName, definition) {
  // Try to drop the policy first (if it exists)
  const dropSQL = `DROP POLICY IF EXISTS "${policyName}" ON public.tasks`;
  console.log(`📝 ${policyName}`);
  console.log(`   Dropping old policy...`);
  
  // We cannot execute DDL directly via Supabase client, so we'll use Management API
  const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  
  try {
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        query: dropSQL + '; ' + definition
      })
    });
    
    if (response.ok) {
      console.log(`   ✅ Success\n`);
      return true;
    } else {
      const error = await response.text();
      console.log(`   ⚠️  Response: ${response.status} - ${error}\n`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  const policies = [
    {
      name: 'Users can view tasks in their projects',
      definition: `CREATE POLICY "Users can view tasks in their projects" ON public.tasks FOR SELECT
        USING (public.user_owns_project(public.project_id_from_stage(stage_id)))`
    },
    {
      name: 'Users can create tasks in their projects',
      definition: `CREATE POLICY "Users can create tasks in their projects" ON public.tasks FOR INSERT
        WITH CHECK (public.user_owns_project(public.project_id_from_stage(stage_id)))`
    },
    {
      name: 'Users can update tasks in their projects',
      definition: `CREATE POLICY "Users can update tasks in their projects" ON public.tasks FOR UPDATE
        USING (public.user_owns_project(public.project_id_from_stage(stage_id)))
        WITH CHECK (public.user_owns_project(public.project_id_from_stage(stage_id)))`
    },
    {
      name: 'Users can delete tasks in their projects',
      definition: `CREATE POLICY "Users can delete tasks in their projects" ON public.tasks FOR DELETE
        USING (public.user_owns_project(public.project_id_from_stage(stage_id)))`
    }
  ];
  
  let successCount = 0;
  for (const policy of policies) {
    const success = await dropAndRecreatePolicy(policy.name, policy.definition);
    if (success) successCount++;
  }
  
  if (successCount === policies.length) {
    console.log('✨ All policies updated successfully!');
    console.log('🔄 Please refresh your browser.\n');
  } else {
    console.log(`⚠️  ${successCount}/${policies.length} policies updated.`);
    console.log('\n📋 Please complete the migration manually:');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/editor\n`);
    console.log('   Copy and run the SQL from: supabase/migrations/20260215000001_fix_tasks_rls.sql\n');
  }
}

main();
