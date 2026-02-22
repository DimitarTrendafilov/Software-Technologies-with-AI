import { supabase } from './supabase.js';
import { navigateTo } from '../utils/navigation.js';

export async function getCurrentUser() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }

  return data.user ?? null;
}

export async function signInWithPassword(email, password) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }

  return data.user;
}

export async function signUpWithPassword(email, password) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }

  return data.user;
}

export async function signOut() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  
  // Navigate to home page after logout
  navigateTo('/');
}

export function initAuthEvents() {
  if (!supabase) {
    return;
  }

  supabase.auth.onAuthStateChange((event, session) => {
    window.dispatchEvent(
      new CustomEvent('auth:changed', {
        detail: {
          event,
          session
        }
      })
    );
  });
}
