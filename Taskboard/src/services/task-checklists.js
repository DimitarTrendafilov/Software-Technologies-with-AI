import { supabase } from './supabase.js';

export async function getTaskChecklist(taskId) {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .select('id, task_id, content, is_done, position, created_at')
    .eq('task_id', taskId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createChecklistItem(taskId, { content, position }) {
  const cleanContent = String(content ?? '').trim();
  if (!cleanContent) {
    throw new Error('Checklist item cannot be empty.');
  }

  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({
      task_id: taskId,
      content: cleanContent,
      position: position ?? 0
    })
    .select('id, task_id, content, is_done, position, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateChecklistItem(itemId, { content, isDone, position }) {
  const payload = {};

  if (content !== undefined) {
    payload.content = content;
  }
  if (isDone !== undefined) {
    payload.is_done = isDone;
  }
  if (position !== undefined) {
    payload.position = position;
  }

  const { data, error } = await supabase
    .from('task_checklist_items')
    .update(payload)
    .eq('id', itemId)
    .select('id, task_id, content, is_done, position, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteChecklistItem(itemId) {
  const { error } = await supabase
    .from('task_checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw error;
  }
}
