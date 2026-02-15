import { supabase } from './supabase.js';

export async function getProjectUsers(projectId) {
  const { data, error } = await supabase.rpc('list_project_users', {
    check_project_id: projectId
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function searchAppUsers(searchQuery) {
  const { data, error } = await supabase.rpc('list_app_users', {
    search_query: searchQuery ?? ''
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addProjectMember(projectId, userId) {
  const { error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: userId
    });

  if (error) {
    throw error;
  }
}

export async function removeProjectMember(projectId, userId) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
