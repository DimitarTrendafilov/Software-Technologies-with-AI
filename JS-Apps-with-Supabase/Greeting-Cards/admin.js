const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG;

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

const cardsTableBody = document.getElementById("cardsTableBody");
const usersTableBody = document.getElementById("usersTableBody");
const templatesTableBody = document.getElementById("templatesTableBody");
const adminStatus = document.getElementById("adminStatus");
const editCardStatus = document.getElementById("editCardStatus");
const deleteCardStatus = document.getElementById("deleteCardStatus");
const templateStatus = document.getElementById("templateStatus");
const deleteTemplateStatus = document.getElementById("deleteTemplateStatus");

const editRecipient = document.getElementById("editRecipient");
const editGreeting = document.getElementById("editGreeting");
const editImage = document.getElementById("editImage");
const saveCardBtn = document.getElementById("saveCardBtn");
const confirmDeleteCardBtn = document.getElementById("confirmDeleteCardBtn");
const deleteCardText = document.getElementById("deleteCardText");

const addTemplateBtn = document.getElementById("addTemplateBtn");
const templateNameInput = document.getElementById("templateName");
const templateImageInput = document.getElementById("templateImage");
const templatePreview = document.getElementById("templatePreview");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");
const confirmDeleteTemplateBtn = document.getElementById("confirmDeleteTemplateBtn");
const deleteTemplateText = document.getElementById("deleteTemplateText");

const editCardModalEl = document.getElementById("editCardModal");
const deleteCardModalEl = document.getElementById("deleteCardModal");
const templateModalEl = document.getElementById("templateModal");
const deleteTemplateModalEl = document.getElementById("deleteTemplateModal");
const editCardModal = editCardModalEl ? new bootstrap.Modal(editCardModalEl) : null;
const deleteCardModal = deleteCardModalEl ? new bootstrap.Modal(deleteCardModalEl) : null;
const templateModal = templateModalEl ? new bootstrap.Modal(templateModalEl) : null;
const deleteTemplateModal = deleteTemplateModalEl ? new bootstrap.Modal(deleteTemplateModalEl) : null;

let cardsCache = new Map();
let activeCardId = null;
let usersCache = [];
let templatesCache = new Map();
let activeTemplateId = null;
let templateMode = "create";
let templatePreviewUrl = "";
let templatePreviewFallback = "";

const TEMPLATE_BUCKET = "card-templates";

const setStatus = (element, message, isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#ff9ccf" : "#ffe06b";
};

const clearStatus = (element) => {
  if (!element) return;
  element.textContent = "";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const shortenId = (value) => {
  if (!value) return "-";
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

const sanitizeFileName = (value) => {
  const base = (value || "template")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "template";
};

const buildTemplatePath = (file) => {
  const safeName = sanitizeFileName(file?.name || "template");
  const id = crypto.randomUUID();
  return `templates/${id}-${safeName}`;
};

const getTemplatePublicUrl = (path) => {
  if (!path) return "";
  const { data } = supabaseClient.storage.from(TEMPLATE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
};

const setTemplatePreview = (url) => {
  if (!templatePreview) return;
  if (templatePreviewUrl && templatePreviewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(templatePreviewUrl);
  }
  templatePreviewUrl = url || "";
  if (!url) {
    templatePreview.src = "";
    templatePreview.classList.add("d-none");
    return;
  }
  templatePreview.src = url;
  templatePreview.classList.remove("d-none");
};

const invokeAdminUsers = async (payload) => {
  console.log("Invoking admin-users with:", payload.action);
  
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token;

  console.log("Token available:", !!token);

  if (!token) {
    throw new Error("No auth token available.");
  }

  try {
    const { data, error } = await supabaseClient.functions.invoke("admin-users", {
      body: payload,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Function response:", { data, error });

    if (error) {
      console.error("Edge Function error:", error);
      throw new Error(error.message || "Edge Function failed");
    }

    if (data?.error) {
      console.error("Function returned error:", data.error);
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error("Exception in invokeAdminUsers:", error);
    throw error;
  }
};

const ensureAdmin = async () => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const session = sessionData?.session;

  console.log("Checking session:", !!session);

  if (!session?.user) {
    const msg = "Please login as an admin.";
    setStatus(adminStatus, msg, true);
    console.error(msg);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
    return false;
  }

  console.log("User ID:", session.user.id);

  try {
    const { data: isAdmin, error } = await supabaseClient.rpc("is_admin");

    console.log("is_admin() response:", { isAdmin, error });

    if (error) {
      console.error("RPC error:", error);
      const msg = "Error checking admin status: " + error.message;
      setStatus(adminStatus, msg, true);
      return false;
    }

    if (!isAdmin) {
      const msg = "Access denied. Admins only.";
      setStatus(adminStatus, msg, true);
      console.error(msg);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1200);
      return false;
    }

    setStatus(adminStatus, "Admin access granted.");
    console.log("Admin check passed.");
    return true;
  } catch (error) {
    console.error("Unexpected error during admin check:", error);
    setStatus(adminStatus, "Error: " + error.message, true);
    return false;
  }
};

const loadCards = async () => {
  if (!cardsTableBody) return;

  const { data, error } = await supabaseClient
    .from("cards")
    .select("id, user_id, person_name, greeting_text, image_template, share_code, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    setStatus(adminStatus, "Failed to load cards.", true);
    cardsTableBody.innerHTML = "";
    return;
  }

  cardsCache = new Map((data || []).map((card) => [card.id, card]));

  if (!data || data.length === 0) {
    cardsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">No cards found.</td>
      </tr>
    `;
    return;
  }

  cardsTableBody.innerHTML = data.map((card) => {
    return `
      <tr>
        <td>${card.person_name || "-"}</td>
        <td title="${card.user_id}">${shortenId(card.user_id)}</td>
        <td>${formatDate(card.created_at)}</td>
        <td>${card.share_code || "-"}</td>
        <td class="text-end">
          <div class="admin-actions">
            <button class="btn btn-sm btn-outline-light" data-action="edit" data-id="${card.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${card.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
};

const openEditModal = (cardId) => {
  const card = cardsCache.get(cardId);
  if (!card) return;

  activeCardId = cardId;
  editRecipient.value = card.person_name || "";
  editGreeting.value = card.greeting_text || "";
  editImage.value = card.image_template || "";
  clearStatus(editCardStatus);
  if (editCardModal) editCardModal.show();
};

const openDeleteModal = (cardId) => {
  const card = cardsCache.get(cardId);
  if (!card) return;

  activeCardId = cardId;
  deleteCardText.textContent = `Delete card for ${card.person_name || "this user"}?`;
  clearStatus(deleteCardStatus);
  if (deleteCardModal) deleteCardModal.show();
};

const saveCardChanges = async () => {
  if (!activeCardId) return;

  setStatus(editCardStatus, "Saving changes...");

  const { error } = await supabaseClient
    .from("cards")
    .update({
      person_name: editRecipient.value.trim(),
      greeting_text: editGreeting.value.trim(),
      image_template: editImage.value.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", activeCardId);

  if (error) {
    setStatus(editCardStatus, error.message, true);
    return;
  }

  setStatus(editCardStatus, "Card updated.");
  await loadCards();

  setTimeout(() => {
    if (editCardModal) editCardModal.hide();
  }, 600);
};

const confirmDeleteCard = async () => {
  if (!activeCardId) return;

  setStatus(deleteCardStatus, "Deleting card...");

  const { error } = await supabaseClient
    .from("cards")
    .delete()
    .eq("id", activeCardId);

  if (error) {
    setStatus(deleteCardStatus, error.message, true);
    return;
  }

  setStatus(deleteCardStatus, "Card deleted.");
  await loadCards();

  setTimeout(() => {
    if (deleteCardModal) deleteCardModal.hide();
  }, 600);
};

const loadUsers = async () => {
  if (!usersTableBody) return;

  try {
    console.log("Attempting to load users from Edge Function...");
    const data = await invokeAdminUsers({ action: "list" });
    usersCache = data?.users || [];
    console.log("Edge Function users loaded:", usersCache.length);
  } catch (error) {
    console.error("Edge Function failed, falling back to user_roles table:", error);
    setStatus(adminStatus, "Loading users from local table...");
    
    // Fallback: load only from user_roles table
    const { data, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("user_id, user_role, created_at")
      .order("created_at", { ascending: false });

    if (rolesError) {
      setStatus(adminStatus, "Failed to load users: " + rolesError.message, true);
      usersTableBody.innerHTML = "";
      return;
    }

    usersCache = (data || []).map((row) => ({
      id: row.user_id,
      email: "—",
      created_at: row.created_at,
      role: row.user_role,
    }));
  }

  if (!usersCache || usersCache.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">No users found.</td>
      </tr>
    `;
    return;
  }

  usersTableBody.innerHTML = usersCache.map((user) => {
    const isAdmin = user.role === "admin";
    const actionLabel = isAdmin ? "Remove Admin" : "Make Admin";
    const actionClass = isAdmin ? "btn-outline-warning" : "btn-outline-light";

    return `
      <tr>
        <td title="${user.id}">${shortenId(user.id)}</td>
        <td>${user.email || "—"}</td>
        <td>${user.role}</td>
        <td>${formatDate(user.created_at)}</td>
        <td class="text-end">
          <button class="btn btn-sm ${actionClass}" data-user-action="toggle" data-id="${user.id}" data-role="${user.role}">${actionLabel}</button>
        </td>
      </tr>
    `;
  }).join("");
};

const loadTemplates = async () => {
  if (!templatesTableBody) return;

  const { data, error } = await supabaseClient
    .from("card_templates")
    .select("id, name, image_path, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    setStatus(adminStatus, "Failed to load templates.", true);
    templatesTableBody.innerHTML = "";
    return;
  }

  templatesCache = new Map((data || []).map((template) => [template.id, template]));

  if (!data || data.length === 0) {
    templatesTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">No templates found.</td>
      </tr>
    `;
    return;
  }

  templatesTableBody.innerHTML = data.map((template) => {
    const publicUrl = getTemplatePublicUrl(template.image_path);
    return `
      <tr>
        <td>${template.name || "-"}</td>
        <td>
          ${publicUrl ? `<img class="template-thumb" src="${publicUrl}" alt="${template.name || "Template"}">` : "-"}
        </td>
        <td>${formatDate(template.updated_at || template.created_at)}</td>
        <td class="text-end">
          <div class="admin-actions">
            <button class="btn btn-sm btn-outline-light" data-template-action="edit" data-id="${template.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-template-action="delete" data-id="${template.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
};

const openTemplateModal = (templateId = null) => {
  clearStatus(templateStatus);
  templateMode = templateId ? "edit" : "create";
  activeTemplateId = templateId;
  templatePreviewFallback = "";

  if (templateNameInput) {
    templateNameInput.value = "";
  }
  if (templateImageInput) {
    templateImageInput.value = "";
  }
  setTemplatePreview("");

  if (templateId) {
    const template = templatesCache.get(templateId);
    if (templateNameInput) templateNameInput.value = template?.name || "";
    const previewUrl = getTemplatePublicUrl(template?.image_path || "");
    templatePreviewFallback = previewUrl || "";
    if (previewUrl) setTemplatePreview(previewUrl);
  }

  const modalLabel = document.getElementById("templateModalLabel");
  if (modalLabel) {
    modalLabel.textContent = templateId ? "Edit Template" : "Add Template";
  }

  if (templateModal) templateModal.show();
};

const openTemplateDeleteModal = (templateId) => {
  const template = templatesCache.get(templateId);
  if (!template) return;

  activeTemplateId = templateId;
  deleteTemplateText.textContent = `Delete template ${template.name || "this item"}?`;
  clearStatus(deleteTemplateStatus);
  if (deleteTemplateModal) deleteTemplateModal.show();
};

const saveTemplateChanges = async () => {
  if (!templateNameInput) return;
  const name = templateNameInput.value.trim();
  const file = templateImageInput?.files?.[0] || null;

  if (!name) {
    setStatus(templateStatus, "Please enter a template name.", true);
    return;
  }

  if (templateMode === "create" && !file) {
    setStatus(templateStatus, "Please choose an image.", true);
    return;
  }

  setStatus(templateStatus, "Saving template...");

  let newPath = "";
  if (file) {
    newPath = buildTemplatePath(file);
    const { error: uploadError } = await supabaseClient.storage
      .from(TEMPLATE_BUCKET)
      .upload(newPath, file, { upsert: false });

    if (uploadError) {
      setStatus(templateStatus, uploadError.message, true);
      return;
    }
  }

  if (templateMode === "create") {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;

    if (userError || !userId) {
      if (newPath) {
        await supabaseClient.storage.from(TEMPLATE_BUCKET).remove([newPath]);
      }
      setStatus(templateStatus, "Please log in again to add templates.", true);
      return;
    }

    const { error } = await supabaseClient
      .from("card_templates")
      .insert([{ name, image_path: newPath, created_by: userId }]);

    if (error) {
      if (newPath) {
        await supabaseClient.storage.from(TEMPLATE_BUCKET).remove([newPath]);
      }
      setStatus(templateStatus, error.message, true);
      return;
    }
  } else {
    const template = templatesCache.get(activeTemplateId);
    if (!template) {
      setStatus(templateStatus, "Template not found.", true);
      return;
    }

    const updatePayload = {
      name,
      updated_at: new Date().toISOString(),
    };
    if (newPath) updatePayload.image_path = newPath;

    const { error } = await supabaseClient
      .from("card_templates")
      .update(updatePayload)
      .eq("id", activeTemplateId);

    if (error) {
      if (newPath) {
        await supabaseClient.storage.from(TEMPLATE_BUCKET).remove([newPath]);
      }
      setStatus(templateStatus, error.message, true);
      return;
    }

    if (newPath && template.image_path && template.image_path !== newPath) {
      await supabaseClient.storage.from(TEMPLATE_BUCKET).remove([template.image_path]);
    }
  }

  setStatus(templateStatus, "Template saved.");
  await loadTemplates();

  setTimeout(() => {
    if (templateModal) templateModal.hide();
  }, 600);
};

const confirmDeleteTemplate = async () => {
  const template = templatesCache.get(activeTemplateId);
  if (!template) return;

  setStatus(deleteTemplateStatus, "Deleting template...");

  const { error } = await supabaseClient
    .from("card_templates")
    .delete()
    .eq("id", activeTemplateId);

  if (error) {
    setStatus(deleteTemplateStatus, error.message, true);
    return;
  }

  const { error: storageError } = await supabaseClient
    .storage
    .from(TEMPLATE_BUCKET)
    .remove([template.image_path]);

  if (storageError) {
    setStatus(deleteTemplateStatus, "Template deleted, but image removal failed.", true);
  } else {
    setStatus(deleteTemplateStatus, "Template deleted.");
  }

  await loadTemplates();

  setTimeout(() => {
    if (deleteTemplateModal) deleteTemplateModal.hide();
  }, 600);
};

const toggleUserRole = async (userId, currentRole) => {
  const nextRole = currentRole === "admin" ? "user" : "admin";
  setStatus(adminStatus, `Updating role to ${nextRole}...`);

  try {
    await invokeAdminUsers({ action: "setRole", userId, role: nextRole });
    setStatus(adminStatus, "Role updated.");
    await loadUsers();
  } catch (error) {
    setStatus(adminStatus, error.message || "Failed to update role.", true);
  }
};

cardsTableBody?.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  const action = target.dataset.action;
  const cardId = target.dataset.id;

  if (!action || !cardId) return;

  if (action === "edit") {
    openEditModal(cardId);
  }

  if (action === "delete") {
    openDeleteModal(cardId);
  }
});

usersTableBody?.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  const userId = target.dataset.id;
  const role = target.dataset.role;

  if (!userId || !role) return;

  toggleUserRole(userId, role);
});

templatesTableBody?.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  const action = target.dataset.templateAction;
  const templateId = target.dataset.id;

  if (!action || !templateId) return;

  if (action === "edit") {
    openTemplateModal(templateId);
  }

  if (action === "delete") {
    openTemplateDeleteModal(templateId);
  }
});

templateImageInput?.addEventListener("change", () => {
  const file = templateImageInput.files?.[0];
  if (!file) {
    setTemplatePreview(templatePreviewFallback || "");
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  setTemplatePreview(previewUrl);
});

addTemplateBtn?.addEventListener("click", () => openTemplateModal());
saveTemplateBtn?.addEventListener("click", saveTemplateChanges);
confirmDeleteTemplateBtn?.addEventListener("click", confirmDeleteTemplate);

saveCardBtn?.addEventListener("click", saveCardChanges);
confirmDeleteCardBtn?.addEventListener("click", confirmDeleteCard);

const initAdminPanel = async () => {
  console.log("Initializing admin panel...");
  const isAdmin = await ensureAdmin();
  console.log("Admin check result:", isAdmin);
  if (!isAdmin) return;

  console.log("Loading cards and users...");
  await Promise.all([loadCards(), loadUsers(), loadTemplates()]);
};

initAdminPanel();
