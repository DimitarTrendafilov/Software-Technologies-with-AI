import { supabase } from './supabase.js';

export function isAdminUser(user) {
  return user?.app_metadata?.role === 'admin';
}

export async function listUsersAdmin() {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function updateUserAdmin({ userId, email, role }) {
  const { error } = await supabase.rpc('admin_update_user', {
    p_user_id: userId,
    p_email: email,
    p_role: role
  });

  if (error) {
    throw error;
  }
}

export async function deleteUserAdmin(userId) {
  const { error } = await supabase.rpc('admin_delete_user', {
    p_user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function listStagesAdmin(projectId) {
  const { data, error } = await supabase
    .from('project_stages')
    .select('id, project_id, name, position, created_at')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listTasksAdmin(projectId) {
  const { data: stages, error: stagesError } = await supabase
    .from('project_stages')
    .select('id')
    .eq('project_id', projectId);

  if (stagesError) {
    throw stagesError;
  }

  const stageIds = (stages ?? []).map((stage) => stage.id);
  if (!stageIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('id, stage_id, title, description, position, done, created_at, updated_at')
    .in('stage_id', stageIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
