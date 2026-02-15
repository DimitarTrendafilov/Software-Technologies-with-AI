import './project-tasks.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import { createTask, deleteTask, getProjectStages, getTasks, updateTask } from '../../services/tasks.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError } from '../../services/toast.js';
import Modal from 'bootstrap/js/dist/modal';

export async function render(params) {
  const html = await loadHtml(new URL('./project-tasks.html', import.meta.url));

  return {
    html,
    async onMount() {
      const state = {
        stages: [],
        tasksByStage: new Map(),
        deleteTaskId: null
      };

      const title = document.querySelector('[data-project-title]');
      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-tasks-error]');
      const emptyState = document.querySelector('[data-empty-state]');
      const boardScroll = document.querySelector('[data-board-scroll]');
      const board = document.querySelector('[data-stages-board]');
      const taskForm = document.querySelector('[data-task-form]');
      const taskModalTitle = document.querySelector('[data-task-modal-title]');
      const taskFormError = document.querySelector('[data-task-form-error]');
      const taskStageIdInput = document.querySelector('[data-task-stage-id]');
      const taskIdInput = document.querySelector('[data-task-id]');
      const taskTitleInput = document.querySelector('#task-title');
      const taskDescriptionInput = document.querySelector('#task-description');
      const taskDoneInput = document.querySelector('#task-done');
      const deleteTaskTitle = document.querySelector('[data-delete-task-title]');
      const confirmDeleteTaskBtn = document.querySelector('[data-confirm-delete-task]');

      const taskModal = new Modal(document.getElementById('taskFormModal'));
      const deleteModal = new Modal(document.getElementById('taskDeleteModal'));

      const escapeHtml = (value) =>
        String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');

      const showInlineError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showError(message);
        }
      };

      const showTaskFormError = (message) => {
        setText(taskFormError, message);
        setHidden(taskFormError, !message);
      };

      const renderBoard = () => {
        if (!board) {
          return;
        }

        board.innerHTML = state.stages
          .map((stage) => {
            const tasks = (state.tasksByStage.get(stage.id) ?? [])
              .slice()
              .sort((first, second) => (first.position ?? 0) - (second.position ?? 0));

            const cards = tasks.length
              ? tasks
                  .map(
                    (task) => `
                        <article class="task-card">
                          <div class="task-card__header">
                            <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
                            <div class="task-card__actions">
                              <button class="btn btn-sm btn-outline-primary" type="button" data-edit-task="${task.id}" data-stage-id="${stage.id}">Edit</button>
                              <button class="btn btn-sm btn-outline-danger" type="button" data-delete-task="${task.id}" data-task-title="${escapeHtml(task.title)}">Delete</button>
                            </div>
                          </div>
                          <p class="task-card__description">${escapeHtml(task.description || 'No description.')}</p>
                        </article>
                      `
                  )
                  .join('')
              : '<div class="text-muted small">No tasks in this stage.</div>';

            return `
                <section class="glass-card tasks-stage">
                  <div class="tasks-stage__header">
                    <h2 class="h6 section-title mb-0">${escapeHtml(stage.name)}</h2>
                    <span class="badge bg-dark-subtle text-dark">${tasks.length}</span>
                  </div>
                  <div class="tasks-stage__list">
                    ${cards}
                    <button class="btn add-task-btn" type="button" data-add-task="${stage.id}">+ <span>Add New Task</span></button>
                  </div>
                </section>
              `;
          })
          .join('');
      };

      const reloadTasks = async () => {
        const tasksByStage = await Promise.all(state.stages.map((stage) => getTasks(stage.id)));
        state.tasksByStage = new Map(state.stages.map((stage, index) => [stage.id, tasksByStage[index] ?? []]));
        renderBoard();
      };

      const openAddModal = (stageId) => {
        setText(taskModalTitle, 'Add Task');
        showTaskFormError('');
        if (taskForm) {
          taskForm.dataset.mode = 'add';
        }
        if (taskStageIdInput) {
          taskStageIdInput.value = stageId;
        }
        if (taskIdInput) {
          taskIdInput.value = '';
        }
        if (taskTitleInput) {
          taskTitleInput.value = '';
        }
        if (taskDescriptionInput) {
          taskDescriptionInput.value = '';
        }
        if (taskDoneInput) {
          taskDoneInput.checked = false;
        }
        taskModal.show();
      };

      const openEditModal = (taskId, stageId) => {
        const tasks = state.tasksByStage.get(stageId) ?? [];
        const task = tasks.find((entry) => entry.id === taskId);
        if (!task) {
          showInlineError('Task not found.');
          return;
        }

        setText(taskModalTitle, 'Edit Task');
        showTaskFormError('');
        if (taskForm) {
          taskForm.dataset.mode = 'edit';
        }
        if (taskStageIdInput) {
          taskStageIdInput.value = stageId;
        }
        if (taskIdInput) {
          taskIdInput.value = task.id;
        }
        if (taskTitleInput) {
          taskTitleInput.value = task.title ?? '';
        }
        if (taskDescriptionInput) {
          taskDescriptionInput.value = task.description ?? '';
        }
        if (taskDoneInput) {
          taskDoneInput.checked = Boolean(task.done);
        }
        taskModal.show();
      };

      setHidden(authRequired, true);
      setHidden(emptyState, true);
      setHidden(boardScroll, true);
      showInlineError('');

      const user = await getCurrentUser();
      if (!user) {
        setHidden(authRequired, false);
        return;
      }

      try {
        const project = await getProject(params.id);
        setText(title, project?.title ?? 'Project');

        state.stages = await getProjectStages(params.id);
        if (!state.stages.length) {
          if (board) {
            board.innerHTML = '';
          }
          setHidden(emptyState, false);
          return;
        }

        await reloadTasks();

        setHidden(boardScroll, false);
      } catch (error) {
        showInlineError(error?.message ?? 'Unable to load project tasks.');
      }

      board?.addEventListener('click', (event) => {
        const addButton = event.target.closest('[data-add-task]');
        if (addButton) {
          const stageId = addButton.getAttribute('data-add-task');
          if (stageId) {
            openAddModal(stageId);
          }
          return;
        }

        const editButton = event.target.closest('[data-edit-task]');
        if (editButton) {
          const taskId = editButton.getAttribute('data-edit-task');
          const stageId = editButton.getAttribute('data-stage-id');
          if (taskId && stageId) {
            openEditModal(taskId, stageId);
          }
          return;
        }

        const deleteButton = event.target.closest('[data-delete-task]');
        if (deleteButton) {
          state.deleteTaskId = deleteButton.getAttribute('data-delete-task');
          const taskTitle = deleteButton.getAttribute('data-task-title') ?? 'this task';
          setText(deleteTaskTitle, taskTitle);
          deleteModal.show();
        }
      });

      taskForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        showTaskFormError('');

        const mode = taskForm.dataset.mode;
        const stageId = String(taskStageIdInput?.value ?? '').trim();
        const taskId = String(taskIdInput?.value ?? '').trim();
        const taskTitle = String(taskTitleInput?.value ?? '').trim();
        const taskDescription = String(taskDescriptionInput?.value ?? '').trim();
        const done = Boolean(taskDoneInput?.checked);

        if (!taskTitle) {
          showTaskFormError('Task title is required.');
          return;
        }

        try {
          if (mode === 'edit' && taskId) {
            const existingTask = (state.tasksByStage.get(stageId) ?? []).find((task) => task.id === taskId);
            await updateTask(taskId, {
              title: taskTitle,
              description: taskDescription,
              done,
              position: existingTask?.position ?? 0
            });
          } else {
            const nextPosition = (state.tasksByStage.get(stageId) ?? []).length;
            await createTask(stageId, {
              title: taskTitle,
              description: taskDescription,
              done,
              position: nextPosition
            });
          }

          taskModal.hide();
          await reloadTasks();
        } catch (error) {
          showTaskFormError(error?.message ?? 'Unable to save task.');
        }
      });

      confirmDeleteTaskBtn?.addEventListener('click', async () => {
        if (!state.deleteTaskId) {
          return;
        }

        try {
          await deleteTask(state.deleteTaskId);
          state.deleteTaskId = null;
          deleteModal.hide();
          await reloadTasks();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to delete task.');
        }
      });
    }
  };
}
