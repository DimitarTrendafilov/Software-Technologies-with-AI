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
    .select('id, stage_id, assignee_id, title, description, position, done, created_at, updated_at')
    .eq('stage_id', stageId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTasksPage(stageId, { offset = 0, limit = 30 } = {}) {
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const { data, count, error } = await supabase
    .from('tasks')
    .select('id, stage_id, assignee_id, title, description, position, done, created_at, updated_at', { count: 'exact' })
    .eq('stage_id', stageId)
    .order('position', { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  const items = data ?? [];
  const total = count ?? 0;

  return {
    items,
    total,
    hasMore: from + items.length < total
  };
}

export async function createTask(stageId, { title, description, position, done, assigneeId }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      stage_id: stageId,
      assignee_id: assigneeId ?? null,
      title,
      description,
      position: position ?? 0,
      done: done ?? false
    })
    .select('id, stage_id, assignee_id, title, description, position, done, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTask(taskId, { title, description, position, done, stageId, assigneeId }) {
  const payload = {};

  if (title !== undefined) {
    payload.title = title;
  }
  if (description !== undefined) {
    payload.description = description;
  }
  if (position !== undefined) {
    payload.position = position;
  }
  if (done !== undefined) {
    payload.done = done;
  }
  if (stageId !== undefined) {
    payload.stage_id = stageId;
  }
  if (assigneeId !== undefined) {
    payload.assignee_id = assigneeId;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .select('id, stage_id, assignee_id, title, description, position, done, created_at, updated_at')
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

  // Get all projects owned by the user
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id');

  if (projectsError || !projects || projects.length === 0) {
    return [];
  }

  const projectIds = projects.map(p => p.id);

  // Get all stages for these projects
  const { data: stages, error: stagesError } = await supabase
    .from('project_stages')
    .select('id')
    .in('project_id', projectIds);

  if (stagesError || !stages || stages.length === 0) {
    return [];
  }

  const stageIds = stages.map(s => s.id);

  // Get all tasks for these stages
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, description, done, created_at, updated_at, stage_id, assignee_id')
    .in('stage_id', stageIds);

  if (tasksError) {
    throw tasksError;
  }

  return tasks ?? [];
}
