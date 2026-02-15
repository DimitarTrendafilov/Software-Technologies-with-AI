import { supabase } from './supabase.js';

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, description, owner_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getProject(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, description, owner_id, created_at, updated_at')
    .eq('id', projectId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createProject({ title, description, userId }) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      title,
      description,
      owner_id: userId
    })
    .select('id, title, description, owner_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProject(projectId, { title, description }) {
  const { data, error } = await supabase
    .from('projects')
    .update({ title, description })
    .eq('id', projectId)
    .select('id, title, description, owner_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteProject(projectId) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    throw error;
  }
}
