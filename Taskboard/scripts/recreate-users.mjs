#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const testUsers = [
  { email: 'steve@gmail.com', password: 'pass123' },
  { email: 'maria@gmail.com', password: 'pass123' },
  { email: 'peter@gmail.com', password: 'pass123' }
];

async function recreateUsers() {
  console.log('🔄 Recreating user accounts with proper settings...\n');

  // List all users
  const { data: userData } = await supabase.auth.admin.listUsers();
  
  for (const testUser of testUsers) {
    console.log(`📧 ${testUser.email}:`);
    
    const existingUser = userData.users.find(u => u.email === testUser.email);
    
    if (existingUser) {
      console.log(`  🗑️  Deleting old user (ID: ${existingUser.id})...`);
      
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      
      if (deleteError) {
        console.log(`  ⚠️  Could not delete: ${deleteError.message}`);
      } else {
        console.log('  ✅ Deleted successfully');
      }
      
      // Wait a bit to ensure deletion is processed
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('  ➕ Creating new user...');
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: { 
        created_by: 'recreate-users-script',
        created_at: new Date().toISOString()
      }
    });

    if (createError) {
      console.log(`  ❌ Failed: ${createError.message}`);
    } else {
      console.log(`  ✅ Created successfully (ID: ${newUser.user.id})`);
      console.log(`  ✓ Email confirmed: YES`);
      console.log(`  ✓ Password: ${testUser.password}`);
    }
    
    console.log('');
  }

  console.log('✨ All users recreated!\n');
  console.log('🔑 Try logging in with:');
  testUsers.forEach(u => {
    console.log(`   ${u.email} / ${u.password}`);
  });
  console.log('\n⚠️  IMPORTANT: Make sure "Confirm email" is DISABLED in Supabase Auth settings!');
  console.log('   https://supabase.com/dashboard/project/' + supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1] + '/auth/providers\n');
}

recreateUsers();
