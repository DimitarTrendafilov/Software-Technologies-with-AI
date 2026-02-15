import { supabase } from './supabase.js';

const BUCKET = 'task-attachments';

export async function getTaskAttachmentsByTaskIds(taskIds) {
  if (!taskIds?.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('task_attachments')
    .select('id, task_id, storage_path, file_name, mime_type, size_bytes, created_at')
    .in('task_id', taskIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const attachments = data ?? [];

  const withUrls = await Promise.all(
    attachments.map(async (attachment) => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(attachment.storage_path, 60 * 60);

      return {
        ...attachment,
        url: signedError ? null : signedData?.signedUrl ?? null
      };
    })
  );

  return withUrls;
}

export async function uploadTaskAttachments(taskId, files, uploadedBy) {
  if (!files?.length) {
    return;
  }

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${taskId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: metadataError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: uploadedBy
      });

    if (metadataError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw metadataError;
    }
  }
}
