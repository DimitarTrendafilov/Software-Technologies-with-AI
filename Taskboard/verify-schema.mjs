import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvdhwwmrhrznxtnaobsn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZGh3d21yaHJ6bnh0bmFvYnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE0ODEwNCwiZXhwIjoyMDg2NzI0MTA0fQ.72retiklFt9Q3a1l3Ja2Q0Slf1k42hjQWHhCUClkDqU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySchema() {
  try {
    console.log('Connecting to Supabase...\n');

    // Check record counts for each table to verify they exist
    const tableNames = ['projects', 'project_stages', 'tasks'];
    const results = {};

    for (const tableName of tableNames) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`✗ ${tableName}: TABLE DOES NOT EXIST - ${error.message}`);
        results[tableName] = { exists: false, count: null, error: error.message };
      } else {
        console.log(`✓ ${tableName}: EXISTS with ${count} records`);
        results[tableName] = { exists: true, count };
      }
    }

    console.log('\n=== SCHEMA VERIFICATION RESULTS ===\n');
    console.log(JSON.stringify(results, null, 2));

    // Summary
    const existingTables = tableNames.filter(t => results[t].exists);
    const missingTables = tableNames.filter(t => !results[t].exists);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Tables existing: ${existingTables.length}/${tableNames.length}`);
    if (existingTables.length > 0) {
      console.log(`  - ${existingTables.join(', ')}`);
    }
    if (missingTables.length > 0) {
      console.log(`Missing tables: ${missingTables.join(', ')}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

verifySchema();
