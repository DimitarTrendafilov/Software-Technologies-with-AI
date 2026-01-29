import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const creatorId = "8ca6d6e9-1c83-4afe-8380-93ad5f669cca";
const bucket = "card-templates";
const templatesDir = path.resolve("birthday-card-images");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const toTemplateName = (fileName) => {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

const getContentType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
};

const run = async () => {
  const files = await readdir(templatesDir);
  const imageFiles = files.filter((file) => /\.(png|jpe?g|webp)$/i.test(file));

  if (imageFiles.length === 0) {
    console.log("No images found in birthday-card-images.");
    return;
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("card_templates")
    .select("id, image_path");

  if (existingError) {
    throw existingError;
  }

  const existingByPath = new Set((existingRows || []).map((row) => row.image_path));
  const inserts = [];

  for (const fileName of imageFiles) {
    const filePath = path.join(templatesDir, fileName);
    const storagePath = `templates/${fileName}`;

    const fileBody = await readFile(filePath);
    const contentType = getContentType(fileName);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBody, {
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.error(`Upload failed for ${fileName}:`, uploadError.message);
      continue;
    }

    if (!existingByPath.has(storagePath)) {
      inserts.push({
        name: toTemplateName(fileName),
        image_path: storagePath,
        created_by: creatorId,
      });
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from("card_templates")
      .insert(inserts);

    if (insertError) {
      throw insertError;
    }
  }

  console.log(`Uploaded ${imageFiles.length} files. Added ${inserts.length} new rows.`);
};

run().catch((error) => {
  console.error("Upload failed:", error.message || error);
  process.exit(1);
});
