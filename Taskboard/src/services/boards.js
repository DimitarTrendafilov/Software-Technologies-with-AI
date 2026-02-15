import { supabase } from './supabase.js';

export async function getBoards() {
  const { data, error } = await supabase
    .from('boards')
    .select('id, name, description, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createBoard({ name, description, ownerId }) {
  const { data: board, error } = await supabase
    .from('boards')
    .insert({ name, description, owner_id: ownerId })
    .select('id, name, description, created_at')
    .single();

  if (error) {
    throw error;
  }

  const { error: membershipError } = await supabase.from('memberships').insert({
    board_id: board.id,
    user_id: ownerId,
    role: 'owner'
  });

  if (membershipError) {
    throw membershipError;
  }

  return board;
}
