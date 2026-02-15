#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const testUsers = [
  { email: 'steve@gmail.com', password: 'pass123' },
  { email: 'maria@gmail.com', password: 'pass123' },
  { email: 'peter@gmail.com', password: 'pass123' }
];

async function diagnoseAuth() {
  console.log('🔍 Supabase Auth Diagnostics\n');
  console.log('=' .repeat(60));
  
  // 1. Check users exist
  console.log('\n1️⃣ Checking user accounts...\n');
  
  const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    return;
  }

  console.log(`Found ${userData.users.length} total users in database\n`);

  for (const testUser of testUsers) {
    const user = userData.users.find(u => u.email === testUser.email);
    
    if (user) {
      console.log(`✅ ${testUser.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email confirmed: ${user.email_confirmed_at ? '✅ YES' : '❌ NO'}`);
      console.log(`   Confirmed at: ${user.email_confirmed_at || 'Never'}`);
      console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
      console.log('');
    } else {
      console.log(`❌ ${testUser.email} - NOT FOUND`);
      console.log('');
    }
  }

  // 2. Test login with each user
  console.log('=' .repeat(60));
  console.log('\n2️⃣ Testing login for each user...\n');

  for (const testUser of testUsers) {
    console.log(`🔐 Testing: ${testUser.email}`);
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      if (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        console.log(`   Error code: ${error.status}`);
        
        if (error.message.includes('Email not confirmed')) {
          console.log('   💡 Solution: Email confirmation is required but not done');
        } else if (error.message.includes('Invalid login credentials')) {
          console.log('   💡 Solution: Either password is wrong OR email confirmation required');
        }
      } else {
        console.log(`   ✅ SUCCESS! User logged in`);
        console.log(`   User ID: ${data.user.id}`);
        
        // Sign out
        await supabaseClient.auth.signOut();
      }
    } catch (err) {
      console.log(`   ❌ ERROR: ${err.message}`);
    }
    
    console.log('');
  }

  // 3. Provide solution
  console.log('=' .repeat(60));
  console.log('\n💡 SOLUTION:\n');
  
  const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
  
  console.log('The "Invalid login credentials" error usually means:');
  console.log('❌ Email confirmation is ENABLED in Supabase Auth settings\n');
  
  console.log('📝 To fix this, you MUST:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/auth/providers');
  console.log('');
  console.log('2. Find the "Email" section');
  console.log('');
  console.log('3. Click the Edit button (looks like a pencil/gear icon)');
  console.log('');
  console.log('4. Find the checkbox that says "Confirm email"');
  console.log('');
  console.log('5. UNCHECK it (turn it OFF)');
  console.log('');
  console.log('6. Click "Save"');
  console.log('');
  console.log('7. Wait 10 seconds, then refresh your app and try logging in again');
  console.log('');
  console.log('=' .repeat(60));
  console.log('');
}

diagnoseAuth();
