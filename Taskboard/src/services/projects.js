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

export async function getProjectsPaged({ page = 1, pageSize = 10 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, count, error } = await supabase
    .from('projects')
    .select('id, title, description, owner_id, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    items: data ?? [],
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safePageSize
  };
}

export async function getProjectSummaries(projectIds) {
  if (!projectIds?.length) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_project_summaries', {
    project_ids: projectIds
  });

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
