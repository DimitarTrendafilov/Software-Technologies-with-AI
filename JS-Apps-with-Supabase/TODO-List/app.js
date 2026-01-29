const SUPABASE_URL = "https://fivkmqhtarxlyxwhliyi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdmttcWh0YXJ4bHl4d2hsaXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTI0MTcsImV4cCI6MjA4NjM2ODQxN30._DpmgBjWaUCXDGHKwFABlWUBLk0EAdIYJAuCVew2bqc";

var supabaseClient = window.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");
const resendConfirmBtn = document.getElementById("resendConfirmBtn");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const refreshBtn = document.getElementById("refreshBtn");
const addTodoBtn = document.getElementById("addTodoBtn");

const todoTableBody = document.getElementById("todoTableBody");
const emptyState = document.getElementById("emptyState");

const todoModal = new bootstrap.Modal(document.getElementById("todoModal"));
const viewModal = new bootstrap.Modal(document.getElementById("viewModal"));
const deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));

const todoModalTitle = document.getElementById("todoModalTitle");
const todoForm = document.getElementById("todoForm");
const todoTitle = document.getElementById("todoTitle");
const todoDescription = document.getElementById("todoDescription");
const todoStatus = document.getElementById("todoStatus");
const todoDue = document.getElementById("todoDue");
const todoSaveBtn = document.getElementById("todoSaveBtn");

const viewTitle = document.getElementById("viewTitle");
const viewDescription = document.getElementById("viewDescription");
const viewStatus = document.getElementById("viewStatus");
const viewDue = document.getElementById("viewDue");
const viewCreated = document.getElementById("viewCreated");

const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let activeUser = null;
let editTodoId = null;
let deleteTodoId = null;
let searchDebounce = null;

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString();
};

const toLocalInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const setAuthMessage = (message, type = "muted") => {
  authMessage.className = `small text-${type} mt-3`;
  authMessage.textContent = message;
};

const setResendVisible = (isVisible) => {
  resendConfirmBtn.classList.toggle("d-none", !isVisible);
};

const toggleAuthUI = (session) => {
  const isLoggedIn = Boolean(session?.user);
  authSection.classList.toggle("d-none", isLoggedIn);
  appSection.classList.toggle("d-none", !isLoggedIn);
  logoutBtn.classList.toggle("d-none", !isLoggedIn);
  userEmail.textContent = session?.user?.email || "";
  activeUser = session?.user || null;
};

const buildQuery = () => {
  let query = supabaseClient.from("todos").select("*").order("created_at", { ascending: false });

  const searchValue = searchInput.value.trim();
  if (searchValue) {
    query = query.or(`title.ilike.%${searchValue}%,description.ilike.%${searchValue}%`);
  }

  const statusValue = statusFilter.value;
  if (statusValue === "open") {
    query = query.eq("is_done", false);
  } else if (statusValue === "done") {
    query = query.eq("is_done", true);
  }

  return query;
};

const loadTodos = async () => {
  if (!activeUser) return;

  todoTableBody.innerHTML = "";
  emptyState.classList.add("d-none");

  const { data, error } = await buildQuery();
  if (error) {
    console.error(error);
    emptyState.textContent = "Unable to load tasks.";
    emptyState.classList.remove("d-none");
    return;
  }

  if (!data || data.length === 0) {
    emptyState.textContent = "No tasks found. Add your first task!";
    emptyState.classList.remove("d-none");
    return;
  }

  data.forEach((todo) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="fw-semibold">${todo.title}</td>
      <td>${todo.description || "-"}</td>
      <td>${todo.due_at ? formatDate(todo.due_at) : "-"}</td>
      <td>
        <span class="badge badge-status ${todo.is_done ? "text-bg-success" : "text-bg-warning"}">
          ${todo.is_done ? "Done" : "Open"}
        </span>
      </td>
      <td>${formatDate(todo.created_at)}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-secondary" data-action="view">View</button>
          <button class="btn btn-outline-primary" data-action="edit">Edit</button>
          <button class="btn btn-outline-danger" data-action="delete">Delete</button>
        </div>
      </td>
    `;

    row.querySelector('[data-action="view"]').addEventListener("click", () => handleView(todo));
    row.querySelector('[data-action="edit"]').addEventListener("click", () => handleEdit(todo));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => handleDelete(todo.id));

    todoTableBody.appendChild(row);
  });
};

const handleView = (todo) => {
  viewTitle.textContent = todo.title;
  viewDescription.textContent = todo.description || "-";
  viewStatus.textContent = todo.is_done ? "Done" : "Open";
  viewDue.textContent = todo.due_at ? formatDate(todo.due_at) : "-";
  viewCreated.textContent = formatDate(todo.created_at);
  viewModal.show();
};

const handleEdit = (todo) => {
  editTodoId = todo.id;
  todoModalTitle.textContent = "Edit Task";
  todoSaveBtn.textContent = "Update";
  todoTitle.value = todo.title;
  todoDescription.value = todo.description || "";
  todoStatus.value = String(todo.is_done);
  todoDue.value = toLocalInputValue(todo.due_at);
  todoModal.show();
};

const handleDelete = (todoId) => {
  deleteTodoId = todoId;
  deleteModal.show();
};

const resetTodoForm = () => {
  editTodoId = null;
  todoModalTitle.textContent = "Add Task";
  todoSaveBtn.textContent = "Save";
  todoForm.reset();
  todoStatus.value = "false";
  todoDue.value = "";
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");
  setResendVisible(false);

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      setAuthMessage("Имейлът не е потвърден. Проверете пощата си или изпратете ново потвърждение.", "warning");
      setResendVisible(true);
    } else {
      setAuthMessage(error.message, "danger");
    }
    return;
  }

  loginForm.reset();
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");
  setResendVisible(false);

  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setAuthMessage(error.message, "danger");
    return;
  }

  registerForm.reset();
  setAuthMessage("Registration successful. Please check your inbox to confirm.", "success");
});

resendConfirmBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) {
    setAuthMessage("Въведете имейл, за да изпратим потвърждение.", "warning");
    return;
  }

  const { error } = await supabaseClient.auth.resend({ type: "signup", email });
  if (error) {
    setAuthMessage(error.message, "danger");
    return;
  }

  setAuthMessage("Изпратихме нов имейл за потвърждение.", "success");
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

addTodoBtn.addEventListener("click", () => {
  resetTodoForm();
  todoModal.show();
});

refreshBtn.addEventListener("click", () => loadTodos());

searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => loadTodos(), 300);
});

statusFilter.addEventListener("change", () => loadTodos());

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: todoTitle.value.trim(),
    description: todoDescription.value.trim() || null,
    is_done: todoStatus.value === "true",
    due_at: todoDue.value ? new Date(todoDue.value).toISOString() : null,
  };

  if (!payload.title) return;

  let response;
  if (editTodoId) {
    response = await supabaseClient.from("todos").update(payload).eq("id", editTodoId);
  } else {
    response = await supabaseClient.from("todos").insert({ ...payload, user_id: activeUser.id });
  }

  if (response.error) {
    alert(response.error.message);
    return;
  }

  todoModal.hide();
  resetTodoForm();
  loadTodos();
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!deleteTodoId) return;

  const { error } = await supabaseClient.from("todos").delete().eq("id", deleteTodoId);
  if (error) {
    alert(error.message);
    return;
  }

  deleteTodoId = null;
  deleteModal.hide();
  loadTodos();
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  toggleAuthUI(session);
  if (session?.user) {
    loadTodos();
  } else {
    todoTableBody.innerHTML = "";
  }
});

const init = async () => {
  const { data } = await supabaseClient.auth.getSession();
  toggleAuthUI(data.session);
  if (data.session?.user) {
    loadTodos();
  }
};

init();
