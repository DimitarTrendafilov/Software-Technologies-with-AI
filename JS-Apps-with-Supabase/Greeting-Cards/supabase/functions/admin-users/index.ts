import { createClient } from "@supabase/supabase-js";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type ActionRequest = {
  action: "list" | "setRole";
  userId?: string;
  role?: "admin" | "user";
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase environment." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return jsonResponse(401, { error: "Missing auth token." });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user) {
    return jsonResponse(401, { error: "Invalid auth token." });
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from("user_roles")
    .select("user_role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError || adminRow?.user_role !== "admin") {
    return jsonResponse(403, { error: "Admins only." });
  }

  let payload: ActionRequest | null = null;

  try {
    payload = (await req.json()) as ActionRequest;
  } catch {
    payload = null;
  }

  if (!payload?.action) {
    return jsonResponse(400, { error: "Missing action." });
  }

  if (payload.action === "list") {
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      return jsonResponse(500, { error: listError.message });
    }

    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, user_role");

    if (rolesError) {
      return jsonResponse(500, { error: rolesError.message });
    }

    const rolesMap = new Map(
      (rolesData || []).map((row) => [row.user_id, row.user_role])
    );

    const users = (userList?.users || []).map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      role: rolesMap.get(user.id) || "user",
    }));

    return jsonResponse(200, { users });
  }

  if (payload.action === "setRole") {
    const userId = payload.userId?.trim();
    const role = payload.role;

    if (!userId || (role !== "admin" && role !== "user")) {
      return jsonResponse(400, { error: "Invalid role request." });
    }

    const { error: upsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, user_role: role });

    if (upsertError) {
      return jsonResponse(500, { error: upsertError.message });
    }

    return jsonResponse(200, { success: true });
  }

  return jsonResponse(400, { error: "Unknown action." });
});
