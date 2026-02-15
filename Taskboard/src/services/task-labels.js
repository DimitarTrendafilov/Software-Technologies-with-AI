import { supabase } from './supabase.js';

export async function getProjectLabels(projectId) {
  const { data, error } = await supabase
    .from('labels')
    .select('id, project_id, name, color, created_at')
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createLabel(projectId, { name, color }) {
  const { data, error } = await supabase
    .from('labels')
    .insert({
      project_id: projectId,
      name,
      color
    })
    .select('id, project_id, name, color, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateLabel(labelId, { name, color }) {
  const payload = {};

  if (name !== undefined) {
    payload.name = name;
  }
  if (color !== undefined) {
    payload.color = color;
  }

  const { data, error } = await supabase
    .from('labels')
    .update(payload)
    .eq('id', labelId)
    .select('id, project_id, name, color, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteLabel(labelId) {
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', labelId);

  if (error) {
    throw error;
  }
}

export async function getTaskLabelAssignments(taskIds) {
  if (!taskIds || taskIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('task_labels')
    .select('task_id, label_id')
    .in('task_id', taskIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function setTaskLabels(taskId, labelIds) {
  const uniqueIds = Array.from(new Set(labelIds ?? [])).filter(Boolean);

  const { error: deleteError } = await supabase
    .from('task_labels')
    .delete()
    .eq('task_id', taskId);

  if (deleteError) {
    throw deleteError;
  }

  if (!uniqueIds.length) {
    return [];
  }

  const rows = uniqueIds.map((labelId) => ({
    task_id: taskId,
    label_id: labelId
  }));

  const { data, error } = await supabase
    .from('task_labels')
    .insert(rows)
    .select('task_id, label_id');

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTasksByLabel(projectId, labelId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, title, description, stage_id, assignee_id, done, position, project_stages!inner(id, name, project_id), task_labels!inner(label_id)'
    )
    .eq('task_labels.label_id', labelId)
    .eq('project_stages.project_id', projectId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
