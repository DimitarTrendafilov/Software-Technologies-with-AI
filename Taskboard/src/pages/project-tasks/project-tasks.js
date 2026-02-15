import './project-tasks.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import { createTask, deleteTask, getProjectStages, getTasks, updateTask } from '../../services/tasks.js';
import { supabase } from '../../services/supabase.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError } from '../../services/toast.js';
import Modal from 'bootstrap/js/dist/modal';

let activeTasksChannel = null;
let activeProjectId = null;
let routeCleanupListenerAttached = false;

function isTaskRoute(pathname) {
  return /^\/project\/[^/]+\/tasks$/.test(pathname) || /^\/projects\/[^/]+\/tasks$/.test(pathname);
}

function cleanupActiveTasksChannel() {
  if (activeTasksChannel) {
    supabase.removeChannel(activeTasksChannel);
    activeTasksChannel = null;
    activeProjectId = null;
  }
}

export async function render(params) {
  const html = await loadHtml(new URL('./project-tasks.html', import.meta.url));

  return {
    html,
    async onMount() {
      const state = {
        stages: [],
        tasksByStage: new Map(),
        deleteTaskId: null,
        drag: null,
        realtimeReloadTimer: null,
        isReloadingTasks: false
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
                        <article class="task-card" draggable="true" data-task-card="${task.id}" data-task-id="${task.id}" data-stage-id="${stage.id}">
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
                  <div class="tasks-stage__list" data-stage-list="${stage.id}">
                    ${cards}
                    <button class="btn add-task-btn" type="button" data-add-task="${stage.id}">+ <span>Add New Task</span></button>
                  </div>
                </section>
              `;
          })
          .join('');
      };

      const reloadTasks = async () => {
        if (state.isReloadingTasks) {
          return;
        }

        state.isReloadingTasks = true;
        try {
          const tasksByStage = await Promise.all(state.stages.map((stage) => getTasks(stage.id)));
          state.tasksByStage = new Map(state.stages.map((stage, index) => [stage.id, tasksByStage[index] ?? []]));
          renderBoard();
        } finally {
          state.isReloadingTasks = false;
        }
      };

      const scheduleRealtimeReload = () => {
        if (state.realtimeReloadTimer) {
          window.clearTimeout(state.realtimeReloadTimer);
        }

        state.realtimeReloadTimer = window.setTimeout(async () => {
          state.realtimeReloadTimer = null;
          try {
            await reloadTasks();
          } catch (error) {
            showInlineError(error?.message ?? 'Unable to refresh tasks.');
          }
        }, 150);
      };

      const saveStageTasks = async (stageId) => {
        const tasks = state.tasksByStage.get(stageId) ?? [];
        for (let index = 0; index < tasks.length; index += 1) {
          const task = tasks[index];
          await updateTask(task.id, {
            title: task.title,
            description: task.description,
            done: task.done,
            position: index,
            stageId
          });
          task.position = index;
          task.stage_id = stageId;
        }
      };

      const getDropIndex = (stageListElement, pointerY) => {
        const cards = Array.from(stageListElement.querySelectorAll('[data-task-card]')).filter(
          (card) => card.dataset.taskId !== state.drag?.taskId
        );

        for (let index = 0; index < cards.length; index += 1) {
          const card = cards[index];
          const rect = card.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (pointerY < midpoint) {
            return index;
          }
        }

        return cards.length;
      };

      const moveTaskInState = (sourceStageId, destinationStageId, taskId, destinationIndex) => {
        const sourceTasks = [...(state.tasksByStage.get(sourceStageId) ?? [])];
        const taskIndex = sourceTasks.findIndex((task) => task.id === taskId);
        if (taskIndex === -1) {
          return false;
        }

        const [movedTask] = sourceTasks.splice(taskIndex, 1);
        const destinationTasks = sourceStageId === destinationStageId
          ? sourceTasks
          : [...(state.tasksByStage.get(destinationStageId) ?? [])];

        const boundedIndex = Math.max(0, Math.min(destinationIndex, destinationTasks.length));
        destinationTasks.splice(boundedIndex, 0, movedTask);

        state.tasksByStage.set(sourceStageId, sourceTasks);
        state.tasksByStage.set(destinationStageId, destinationTasks);
        return true;
      };

      const persistMove = async (sourceStageId, destinationStageId) => {
        if (sourceStageId === destinationStageId) {
          await saveStageTasks(sourceStageId);
          return;
        }

        await saveStageTasks(sourceStageId);
        await saveStageTasks(destinationStageId);
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

        if (activeTasksChannel && activeProjectId !== params.id) {
          cleanupActiveTasksChannel();
        }

        if (!activeTasksChannel) {
          const stageIds = new Set(state.stages.map((stage) => stage.id));
          activeTasksChannel = supabase
            .channel(`project-tasks-live:${params.id}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'tasks' },
              (payload) => {
                const newStageId = payload.new?.stage_id;
                const oldStageId = payload.old?.stage_id;

                if (stageIds.has(newStageId) || stageIds.has(oldStageId)) {
                  scheduleRealtimeReload();
                }
              }
            )
            .subscribe();
          activeProjectId = params.id;
        }

        if (!routeCleanupListenerAttached) {
          window.addEventListener('popstate', () => {
            if (!isTaskRoute(window.location.pathname)) {
              cleanupActiveTasksChannel();
            }
          });
          routeCleanupListenerAttached = true;
        }

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

      board?.addEventListener('dragstart', (event) => {
        const taskCard = event.target.closest('[data-task-card]');
        if (!taskCard) {
          return;
        }

        const taskId = taskCard.getAttribute('data-task-id');
        const sourceStageId = taskCard.getAttribute('data-stage-id');
        if (!taskId || !sourceStageId) {
          return;
        }

        state.drag = { taskId, sourceStageId };
        taskCard.classList.add('is-dragging');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', taskId);
        }
      });

      board?.addEventListener('dragend', (event) => {
        const taskCard = event.target.closest('[data-task-card]');
        if (taskCard) {
          taskCard.classList.remove('is-dragging');
        }
        board.querySelectorAll('[data-stage-list]').forEach((stageList) => {
          stageList.classList.remove('is-drop-target');
        });
        state.drag = null;
      });

      board?.addEventListener('dragover', (event) => {
        const stageList = event.target.closest('[data-stage-list]');
        if (!stageList || !state.drag) {
          return;
        }

        event.preventDefault();
        board.querySelectorAll('[data-stage-list]').forEach((list) => {
          list.classList.toggle('is-drop-target', list === stageList);
        });
      });

      board?.addEventListener('drop', async (event) => {
        const stageList = event.target.closest('[data-stage-list]');
        if (!stageList || !state.drag) {
          return;
        }

        event.preventDefault();
        const destinationStageId = stageList.getAttribute('data-stage-list');
        const { taskId, sourceStageId } = state.drag;
        if (!destinationStageId || !taskId || !sourceStageId) {
          return;
        }

        const destinationIndex = getDropIndex(stageList, event.clientY);
        const moved = moveTaskInState(sourceStageId, destinationStageId, taskId, destinationIndex);
        if (!moved) {
          return;
        }

        renderBoard();

        try {
          await persistMove(sourceStageId, destinationStageId);
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to move task.');
          await reloadTasks();
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
