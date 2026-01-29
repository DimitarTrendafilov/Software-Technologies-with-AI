const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
const supabaseSdk = window.supabase;
let contactsDb = null;

const isValidSupabaseConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return false;
  }
  if (SUPABASE_URL.includes("YOUR_SUPABASE_URL_HERE")) {
    return false;
  }
  return SUPABASE_URL.startsWith("https://");
};


const contactsBody = document.getElementById("contactsBody");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("searchInput");
const addContactBtn = document.getElementById("addContactBtn");

const contactDialog = document.getElementById("contactDialog");
const contactForm = document.getElementById("contactForm");
const dialogTitle = document.getElementById("dialogTitle");
const contactIdInput = document.getElementById("contactId");
const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const emailInput = document.getElementById("emailInput");
const townInput = document.getElementById("townInput");
const commentsInput = document.getElementById("commentsInput");
const cancelBtn = document.getElementById("cancelBtn");

const confirmDialog = document.getElementById("confirmDialog");
const confirmForm = document.getElementById("confirmForm");
const confirmText = document.getElementById("confirmText");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");

let contactsCache = [];
let deleteTargetId = null;

const encodeComments = (town, comments) => {
  const payload = {
    town: town?.trim() || "",
    comments: comments?.trim() || "",
  };
  return JSON.stringify(payload);
};

const decodeComments = (raw) => {
  if (!raw) {
    return { town: "", comments: "" };
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        town: parsed.town || "",
        comments: parsed.comments || "",
      };
    }
  } catch (error) {
    return { town: "", comments: raw };
  }
  return { town: "", comments: String(raw) };
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const ensureDbReady = () => {
  if (!contactsDb) {
    alert("Set SUPABASE_URL and SUPABASE_ANON_KEY in config.js first.");
    return false;
  }
  return true;
};

const renderContacts = (contacts) => {
  contactsBody.innerHTML = "";
  if (!contacts.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No contacts found.";
    cell.className = "status";
    row.appendChild(cell);
    contactsBody.appendChild(row);
    return;
  }

  contacts.forEach((contact) => {
    const { town, comments } = decodeComments(contact.comments);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(contact.name)}</td>
      <td>${escapeHtml(contact.phone)}</td>
      <td>${escapeHtml(contact.email)}</td>
      <td>${escapeHtml(town)}</td>
      <td>${escapeHtml(comments)}</td>
      <td>
        <div class="row-actions">
          <button class="ghost" data-action="edit" data-id="${contact.id}">Edit</button>
          <button class="danger" data-action="delete" data-id="${contact.id}">Delete</button>
        </div>
      </td>
    `;
    contactsBody.appendChild(row);
  });
};

const escapeHtml = (value) => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const loadContacts = async () => {
  setStatus("Loading contacts…");
  const { data, error } = await contactsDb
    .from("contacts")
    .select("id, name, phone, email, comments")
    .order("name", { ascending: true });

  if (error) {
    setStatus("Failed to load contacts.");
    console.error("Load error:", error);
    return;
  }

  contactsCache = data || [];
  console.log("Loaded contacts:", contactsCache);
  setStatus(`${contactsCache.length} contact(s)`);
  applySearchFilter();
};

const applySearchFilter = () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    renderContacts(contactsCache);
    return;
  }
  const filtered = contactsCache.filter((contact) => {
    const { town, comments } = decodeComments(contact.comments);
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      town.toLowerCase().includes(query) ||
      comments.toLowerCase().includes(query)
    );
  });
  renderContacts(filtered);
};

const openDialogForCreate = () => {
  dialogTitle.textContent = "Add Contact";
  contactIdInput.value = "";
  contactForm.reset();
  contactDialog.showModal();
};

const openDialogForEdit = (contact) => {
  dialogTitle.textContent = "Edit Contact";
  contactIdInput.value = contact.id;
  nameInput.value = contact.name || "";
  phoneInput.value = contact.phone || "";
  emailInput.value = contact.email || "";
  const { town, comments } = decodeComments(contact.comments);
  townInput.value = town;
  commentsInput.value = comments;
  contactDialog.showModal();
};

const closeDialog = () => {
  contactDialog.close();
};

const openConfirmDialog = (contact) => {
  deleteTargetId = contact.id;
  confirmText.textContent = `Delete ${contact.name}?`;
  confirmDialog.showModal();
};

const closeConfirmDialog = () => {
  confirmDialog.close();
  deleteTargetId = null;
};

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!ensureDbReady()) {
    return;
  }

  const payload = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
    comments: encodeComments(townInput.value, commentsInput.value),
  };

  const id = contactIdInput.value;

  if (id) {
    const { error } = await contactsDb
      .from("contacts")
      .update(payload)
      .eq("id", id);

    if (error) {
      alert("Failed to update contact.");
      console.error(error);
      return;
    }
  } else {
    const { error } = await contactsDb.from("contacts").insert(payload);

    if (error) {
      alert("Failed to add contact.");
      console.error(error);
      return;
    }
  }

  closeDialog();
  await loadContacts();
});

confirmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!ensureDbReady()) {
    return;
  }
  if (!deleteTargetId) {
    closeConfirmDialog();
    return;
  }

  const { error } = await contactsDb
    .from("contacts")
    .delete()
    .eq("id", deleteTargetId);

  if (error) {
    alert("Failed to delete contact.");
    console.error(error);
    return;
  }

  closeConfirmDialog();
  await loadContacts();
});

cancelBtn.addEventListener("click", closeDialog);
confirmCancelBtn.addEventListener("click", closeConfirmDialog);

addContactBtn.addEventListener("click", openDialogForCreate);

searchInput.addEventListener("input", applySearchFilter);

contactsBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const action = button.dataset.action;
  const idStr = button.dataset.id;
  console.log("Button clicked:", { action, idStr, cacheLength: contactsCache.length });
  
  const contact = contactsCache.find((item) => {
    return String(item.id) === String(idStr);
  });
  
  console.log("Found contact:", contact);
  if (!contact) {
    console.warn("Contact not found for ID:", idStr, "Cache IDs:", contactsCache.map(c => c.id));
    return;
  }
  
  if (action === "edit") {
    openDialogForEdit(contact);
  }
  if (action === "delete") {
    openConfirmDialog(contact);
  }
});

if (!supabaseSdk || !isValidSupabaseConfig()) {
  setStatus("Set SUPABASE_URL and SUPABASE_ANON_KEY in config.js to load contacts.");
} else {
  contactsDb = supabaseSdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  loadContacts();
}
