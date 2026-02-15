import { supabase } from './supabase.js';

export async function getProjectStages(projectId) {
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

export async function createProjectStage(projectId, { name, position }) {
  const { data, error } = await supabase
    .from('project_stages')
    .insert({
      project_id: projectId,
      name,
      position: position ?? 0
    })
    .select('id, project_id, name, position, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProjectStage(stageId, { name, position }) {
  const { data, error } = await supabase
    .from('project_stages')
    .update({ name, position })
    .eq('id', stageId)
    .select('id, project_id, name, position, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteProjectStage(stageId) {
  const { error } = await supabase
    .from('project_stages')
    .delete()
    .eq('id', stageId);

  if (error) {
    throw error;
  }
}

export async function getTasks(stageId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, stage_id, title, description, position, done, created_at, updated_at')
    .eq('stage_id', stageId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createTask(stageId, { title, description, position, done }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      stage_id: stageId,
      title,
      description,
      position: position ?? 0,
      done: done ?? false
    })
    .select('id, stage_id, title, description, position, done, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTask(taskId, { title, description, position, done }) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ title, description, position, done })
    .eq('id', taskId)
    .select('id, stage_id, title, description, position, done, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTask(taskId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    throw error;
  }
}

export async function getAllUserTasks() {
  // First get the current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    return [];
  }

  // Get all tasks for projects owned by the user
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      done,
      created_at,
      updated_at,
      stage_id,
      project_stages!inner (
        project_id,
        projects!inner (
          owner_id
        )
      )
    `)
    .eq('project_stages.projects.owner_id', userData.user.id);

  if (error) {
    throw error;
  }

  return data ?? [];
}
