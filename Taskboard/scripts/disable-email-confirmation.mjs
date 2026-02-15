#!/usr/bin/env node

import { config } from 'dotenv';

config();

const projectRef = process.env.VITE_SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectRef || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🔧 Disabling email confirmation in Supabase Auth...\n');
console.log(`📦 Project: ${projectRef}\n`);

// Note: The Management API requires a Supabase access token, not service role key
// So we'll provide manual instructions instead

console.log('📋 To disable email confirmation, follow these steps:\n');
console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/auth/providers');
console.log('2. Find the "Email" provider section');
console.log('3. Click "Edit" or expand the Email section');
console.log('4. Look for "Confirm email" checkbox');
console.log('5. UNCHECK "Confirm email"');
console.log('6. Click "Save"\n');

console.log('✨ After disabling email confirmation:');
console.log('   - Users can login immediately after registration');
console.log('   - No email verification required');
console.log('   - Existing users will work without issues\n');

console.log('🔑 Test with these credentials:');
console.log('   steve@gmail.com / pass123');
console.log('   maria@gmail.com / pass123');
console.log('   peter@gmail.com / pass123\n');

// Try to open the browser automatically
import { exec } from 'child_process';
const url = `https://supabase.com/dashboard/project/${projectRef}/auth/providers`;

console.log('🌐 Opening Supabase Dashboard...\n');

exec(`start ${url}`, (error) => {
  if (error) {
    console.log(`⚠️  Could not open browser automatically. Please visit:\n   ${url}\n`);
  }
});
