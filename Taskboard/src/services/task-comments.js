import { supabase } from './supabase.js';

export async function getTaskComments(taskId) {
  const { data, error } = await supabase
    .from('task_comments')
    .select('id, task_id, author_id, content, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createTaskComment(taskId, content, authorId) {
  const cleanContent = String(content ?? '').trim();
  if (!cleanContent) {
    throw new Error('Comment cannot be empty.');
  }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: authorId,
      content: cleanContent
    })
    .select('id, task_id, author_id, content, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTaskComment(commentId) {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw error;
  }
}
