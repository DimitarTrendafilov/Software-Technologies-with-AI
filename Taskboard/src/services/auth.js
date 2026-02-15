import { supabase } from './supabase.js';
import { navigateTo } from '../utils/navigation.js';

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }

  return data.user ?? null;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }

  return data.user;
}

export async function signUpWithPassword(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }

  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  
  // Navigate to home page after logout
  navigateTo('/');
}

export function initAuthEvents() {
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
