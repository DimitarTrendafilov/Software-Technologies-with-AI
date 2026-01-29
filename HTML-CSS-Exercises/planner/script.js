const STORAGE_KEY = "planner.tasks";

const addTaskBtn = document.getElementById("addTaskBtn");
const taskModal = document.getElementById("taskModal");
const confirmModal = document.getElementById("confirmModal");
const closeTaskModal = document.getElementById("closeTaskModal");
const taskForm = document.getElementById("taskForm");
const taskIdInput = document.getElementById("taskId");
const taskNameInput = document.getElementById("taskName");
const taskPriorityInput = document.getElementById("taskPriority");
const taskCategoryInput = document.getElementById("taskCategory");
const taskSectionInput = document.getElementById("taskSection");
const todayList = document.getElementById("todayList");
const weekList = document.getElementById("weekList");
const monthList = document.getElementById("monthList");
const todayProgressFill = document.getElementById("todayProgressFill");
const todayProgressText = document.getElementById("todayProgressText");
const todayProgressCount = document.getElementById("todayProgressCount");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let tasks = loadTasks();
let pendingDeleteId = null;

addTaskBtn.addEventListener("click", () => openTaskModal());
closeTaskModal.addEventListener("click", () => closeModal(taskModal));
cancelDeleteBtn.addEventListener("click", () => closeModal(confirmModal));
confirmDeleteBtn.addEventListener("click", () => {
  if (pendingDeleteId) {
    deleteTask(pendingDeleteId);
  }
  closeModal(confirmModal);
});

taskModal.addEventListener("click", (event) => {
  if (event.target === taskModal) {
    closeModal(taskModal);
  }
});

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeModal(confirmModal);
  }
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const taskData = {
    id: taskIdInput.value || crypto.randomUUID(),
    name: taskNameInput.value.trim(),
    priority: taskPriorityInput.value,
    category: taskCategoryInput.value,
    section: taskSectionInput.value,
    done: false,
    createdAt: new Date().toISOString(),
  };

  if (!taskData.name) {
    taskNameInput.focus();
    return;
  }

  if (taskIdInput.value) {
    tasks = tasks.map((task) => (task.id === taskData.id ? { ...task, ...taskData } : task));
  } else {
    tasks.unshift(taskData);
  }

  saveTasks();
  renderTasks();
  closeModal(taskModal);
});

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function openTaskModal(task = null) {
  taskForm.reset();
  taskIdInput.value = "";

  if (task) {
    document.getElementById("taskModalTitle").textContent = "Редактирай задача";
    taskIdInput.value = task.id;
    taskNameInput.value = task.name;
    taskPriorityInput.value = task.priority;
    taskCategoryInput.value = task.category;
    taskSectionInput.value = task.section;
  } else {
    document.getElementById("taskModalTitle").textContent = "Добави задача";
  }

  openModal(taskModal);
  taskNameInput.focus();
}

function openModal(modal) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
}

function toggleTask(taskId) {
  tasks = tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          done: !task.done,
        }
      : task
  );
  saveTasks();
  renderTasks();
}

function askDelete(taskId) {
  pendingDeleteId = taskId;
  openModal(confirmModal);
}

function createBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

function renderTasks() {
  todayList.innerHTML = "";
  weekList.innerHTML = "";
  monthList.innerHTML = "";

  tasks.forEach((task) => {
    const list = task.section === "today" ? todayList : task.section === "week" ? weekList : monthList;
    const card = document.createElement("li");
    card.className = `task-card ${task.done ? "task-done" : ""}`;

    const header = document.createElement("div");
    header.className = "task-header";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.name;

    const badges = document.createElement("div");
    badges.className = "task-meta";
    badges.appendChild(createBadge(task.priority, task.priority.toLowerCase()));
    if (task.category) {
      badges.appendChild(createBadge(task.category, "category"));
    }

    header.appendChild(title);
    header.appendChild(badges);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = task.done ? "Отбележи като незавършена" : "Отбележи като завършена";
    toggleBtn.addEventListener("click", () => toggleTask(task.id));

    const editBtn = document.createElement("button");
    editBtn.textContent = "Редактирай";
    editBtn.addEventListener("click", () => openTaskModal(task));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Изтрий";
    deleteBtn.addEventListener("click", () => askDelete(task.id));

    actions.append(toggleBtn, editBtn, deleteBtn);

    card.append(header, actions);
    list.appendChild(card);
  });

  updateTodayProgress();
}

function updateTodayProgress() {
  const todayTasks = tasks.filter((task) => task.section === "today");
  const completed = todayTasks.filter((task) => task.done).length;
  const total = todayTasks.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  todayProgressFill.style.width = `${percent}%`;
  todayProgressFill.parentElement.setAttribute("aria-valuenow", percent.toString());
  todayProgressText.textContent = `${percent}% изпълнени`;
  todayProgressCount.textContent = `${completed}/${total} задачи`;
}

renderTasks();
