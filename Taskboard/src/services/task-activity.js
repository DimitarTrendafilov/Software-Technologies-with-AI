import { supabase } from './supabase.js';

export async function getProjectActivity(projectId, { limit = 200 } = {}) {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const { data, error } = await supabase
    .from('task_activity')
    .select('id, project_id, task_id, task_title, actor_id, action, details, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return data ?? [];
}
