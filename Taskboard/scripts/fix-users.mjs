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
  { email: 'steve@gmail.com', password: '123456' },
  { email: 'maria@gmail.com', password: '123456' },
  { email: 'peter@gmail.com', password: '123456' }
];

async function checkAndFixUsers() {
  console.log('🔍 Checking user accounts...\n');

  // List all users
  const { data: userData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  console.log(`Found ${userData.users.length} users in database\n`);

  for (const testUser of testUsers) {
    console.log(`📧 ${testUser.email}:`);
    
    const existingUser = userData.users.find(u => u.email === testUser.email);
    
    if (!existingUser) {
      console.log('  ⚠️  User not found, creating...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: { created_by: 'fix-users-script' }
      });

      if (createError) {
        console.log(`  ❌ Failed to create: ${createError.message}`);
      } else {
        console.log(`  ✅ Created successfully (ID: ${newUser.user.id})`);
      }
    } else {
      console.log(`  ✓ User exists (ID: ${existingUser.id})`);
      
      // Check if email is confirmed
      if (!existingUser.email_confirmed_at) {
        console.log('  ⚠️  Email not confirmed, confirming now...');
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { email_confirm: true }
        );

        if (updateError) {
          console.log(`  ❌ Failed to confirm email: ${updateError.message}`);
        } else {
          console.log('  ✅ Email confirmed');
        }
      } else {
        console.log(`  ✓ Email confirmed at ${existingUser.email_confirmed_at}`);
      }

      // Reset password to make sure it's correct
      console.log('  🔄 Resetting password to "123456"...');
      
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: testUser.password }
      );

      if (passwordError) {
        console.log(`  ❌ Failed to reset password: ${passwordError.message}`);
      } else {
        console.log('  ✅ Password reset successfully');
      }
    }
    
    console.log('');
  }

  console.log('✨ All users checked and fixed!\n');
  console.log('🔑 Test credentials:');
  testUsers.forEach(u => {
    console.log(`   ${u.email} / ${u.password}`);
  });
  console.log('');
}

checkAndFixUsers();
