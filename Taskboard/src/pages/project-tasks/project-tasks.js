import './project-tasks.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { getProject } from '../../services/projects.js';
import { createTask, deleteTask, getProjectStages, getTasks, getTasksPage, updateTask } from '../../services/tasks.js';
import { getTaskAttachmentsByTaskIds, uploadTaskAttachments } from '../../services/task-attachments.js';
import { getTaskComments, createTaskComment, deleteTaskComment } from '../../services/task-comments.js';
import { getProjectUsers } from '../../services/project-members.js';
import { supabase } from '../../services/supabase.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError } from '../../services/toast.js';
import Modal from 'bootstrap/js/dist/modal';

const TASKS_PAGE_SIZE = 30;

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
        stageTaskState: new Map(),
        deleteTaskId: null,
        drag: null,
        realtimeReloadTimer: null,
        isReloadingTasks: false,
        currentUserId: null,
        attachmentsByTaskId: new Map(),
        userEmailById: new Map(),
        activeDiscussionTaskId: null,
        projectUsers: [],
        filterMyTasks: false
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
      const taskAssigneeInput = document.querySelector('[data-task-assignee]');
      const taskDoneInput = document.querySelector('#task-done');
      const taskFilesInput = document.querySelector('[data-task-files]');
      const deleteTaskTitle = document.querySelector('[data-delete-task-title]');
      const confirmDeleteTaskBtn = document.querySelector('[data-confirm-delete-task]');
      const taskDiscussion = document.querySelector('[data-task-discussion]');
      const taskCommentsList = document.querySelector('[data-task-comments-list]');
      const taskCommentForm = document.querySelector('[data-task-comment-form]');
      const taskCommentInput = document.querySelector('[data-task-comment-input]');
      const filterMyTasksCheckbox = document.querySelector('[data-filter-my-tasks]');

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

      const formatCommentTimestamp = (value) => {
        if (!value) {
          return '';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return '';
        }

        return parsed.toLocaleString();
      };

      const getDisplayName = (userId) => {
        if (!userId) {
          return 'Unassigned';
        }
        if (userId === state.currentUserId) {
          return 'You';
        }

        return state.userEmailById.get(userId) ?? 'Unknown user';
      };

      const renderAssigneeOptions = (selectedUserId = '') => {
        if (!taskAssigneeInput) {
          return;
        }

        const selected = String(selectedUserId ?? '');
        taskAssigneeInput.innerHTML = [
          '<option value="">Unassigned</option>',
          ...state.projectUsers.map((entry) => {
            const value = String(entry.user_id ?? '');
            const isSelected = value === selected ? ' selected' : '';
            return `<option value="${escapeHtml(value)}"${isSelected}>${escapeHtml(entry.email ?? 'Unknown user')}</option>`;
          })
        ].join('');
      };

      const renderTaskComments = (comments) => {
        if (!taskCommentsList) {
          return;
        }

        if (!comments?.length) {
          taskCommentsList.innerHTML = '<p class="text-muted small mb-0">No comments yet.</p>';
          return;
        }

        taskCommentsList.innerHTML = comments
          .map((comment) => {
            const canDelete = comment.author_id === state.currentUserId;
            return `
              <article class="task-comment-item">
                <div class="task-comment-item__meta">
                  <span class="task-comment-item__author">${escapeHtml(getDisplayName(comment.author_id))}</span>
                  <span class="task-comment-item__time">${escapeHtml(formatCommentTimestamp(comment.created_at))}</span>
                </div>
                <p class="task-comment-item__content">${escapeHtml(comment.content)}</p>
                ${
                  canDelete
                    ? `<div class="d-flex justify-content-end mt-2"><button class="btn btn-sm btn-outline-danger" type="button" data-delete-comment="${comment.id}">Delete</button></div>`
                    : ''
                }
              </article>
            `;
          })
          .join('');
      };

      const loadTaskDiscussion = async (taskId) => {
        if (!taskId) {
          return;
        }

        state.activeDiscussionTaskId = taskId;
        if (taskCommentsList) {
          taskCommentsList.innerHTML = '<p class="text-muted small mb-0">Loading comments...</p>';
        }

        const comments = await getTaskComments(taskId);
        renderTaskComments(comments);
      };

      const getStageMeta = (stageId) => state.stageTaskState.get(stageId);

      const listTaskIds = () =>
        Array.from(state.stageTaskState.values())
          .flatMap((meta) => meta.items)
          .map((task) => task.id);

      const rebuildAttachments = async () => {
        const attachments = await getTaskAttachmentsByTaskIds(listTaskIds());
        state.attachmentsByTaskId = new Map();
        attachments.forEach((attachment) => {
          const list = state.attachmentsByTaskId.get(attachment.task_id) ?? [];
          list.push(attachment);
          state.attachmentsByTaskId.set(attachment.task_id, list);
        });
      };

      const buildTaskCardHtml = (task, stageId) => {
        const attachments = state.attachmentsByTaskId.get(task.id) ?? [];
        const attachmentHtml = attachments.length
          ? `<div class="task-card__attachments">${attachments
              .map((attachment) => {
                if (!attachment.url) {
                  return `<span class="text-muted small">${escapeHtml(attachment.file_name)}</span>`;
                }

                return `<a class="task-card__attachment" href="${escapeHtml(
                  attachment.url
                )}" target="_blank" rel="noopener noreferrer">📎 ${escapeHtml(attachment.file_name)}</a>`;
              })
              .join('')}</div>`
          : '';

        return `
          <article class="task-card" draggable="true" data-task-card="${task.id}" data-task-id="${task.id}" data-stage-id="${stageId}">
            <div class="task-card__header">
              <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
              <div class="task-card__actions">
                <button class="btn btn-sm btn-outline-secondary" type="button" data-discuss-task="${task.id}" data-stage-id="${stageId}">Discuss</button>
                <button class="btn btn-sm btn-outline-primary" type="button" data-edit-task="${task.id}" data-stage-id="${stageId}">Edit</button>
                <button class="btn btn-sm btn-outline-danger" type="button" data-delete-task="${task.id}" data-task-title="${escapeHtml(task.title)}">Delete</button>
              </div>
            </div>
            <p class="task-card__description">${escapeHtml(task.description || 'No description.')}</p>
            <p class="task-card__description">Responsible: ${escapeHtml(getDisplayName(task.assignee_id))}</p>
            ${attachmentHtml}
          </article>
        `;
      };

      const renderBoard = () => {
        if (!board) {
          return;
        }

        const scrollPositions = new Map();
        board.querySelectorAll('[data-stage-list]').forEach((element) => {
          const stageId = element.getAttribute('data-stage-list');
          if (stageId) {
            scrollPositions.set(stageId, element.scrollTop);
          }
        });

        board.innerHTML = state.stages
          .map((stage) => {
            const meta = getStageMeta(stage.id);
            let tasks = (meta?.items ?? []).slice().sort((first, second) => (first.position ?? 0) - (second.position ?? 0));
            
            if (state.filterMyTasks) {
              tasks = tasks.filter((task) => task.assignee_id === state.currentUserId);
            }

            const cards = tasks.length
              ? tasks.map((task) => buildTaskCardHtml(task, stage.id)).join('')
              : '<div class="text-muted small">No tasks in this stage.</div>';

            const loader = meta?.loading
              ? '<div class="text-muted small">Loading more...</div>'
              : meta?.hasMore
                ? '<div class="text-muted small">Scroll for more tasks...</div>'
                : '';

            return `
              <section class="glass-card tasks-stage">
                <div class="tasks-stage__header">
                  <h2 class="h6 section-title mb-0">${escapeHtml(stage.name)}</h2>
                  <span class="badge bg-dark-subtle text-dark">${meta?.total ?? tasks.length}</span>
                </div>
                <div class="tasks-stage__list" data-stage-list="${stage.id}">
                  ${cards}
                  ${loader}
                  <button class="btn add-task-btn" type="button" data-add-task="${stage.id}">+ <span>Add New Task</span></button>
                </div>
              </section>
            `;
          })
          .join('');

        board.querySelectorAll('[data-stage-list]').forEach((element) => {
          const stageId = element.getAttribute('data-stage-list');
          if (!stageId) {
            return;
          }
          const previousScroll = scrollPositions.get(stageId);
          if (typeof previousScroll === 'number') {
            element.scrollTop = previousScroll;
          }
        });
      };

      const loadMoreStageTasks = async (stageId, { rerender = true } = {}) => {
        const meta = getStageMeta(stageId);
        if (!meta || meta.loading || !meta.hasMore) {
          return;
        }

        meta.loading = true;
        if (rerender) {
          renderBoard();
        }

        try {
          const page = await getTasksPage(stageId, {
            offset: meta.offset,
            limit: TASKS_PAGE_SIZE
          });

          meta.items.push(...page.items);
          meta.offset += page.items.length;
          meta.total = page.total;
          meta.hasMore = page.hasMore;

          const newTaskIds = page.items.map((task) => task.id);
          if (newTaskIds.length) {
            const newAttachments = await getTaskAttachmentsByTaskIds(newTaskIds);
            newAttachments.forEach((attachment) => {
              const list = state.attachmentsByTaskId.get(attachment.task_id) ?? [];
              list.push(attachment);
              state.attachmentsByTaskId.set(attachment.task_id, list);
            });
          }
        } finally {
          meta.loading = false;
          if (rerender) {
            renderBoard();
          }
        }
      };

      const initializeStageTaskState = () => {
        state.stageTaskState = new Map(
          state.stages.map((stage) => [
            stage.id,
            {
              items: [],
              offset: 0,
              total: 0,
              hasMore: true,
              loading: false
            }
          ])
        );
      };

      const preloadInitialStageTasks = async () => {
        await Promise.all(state.stages.map((stage) => loadMoreStageTasks(stage.id, { rerender: false })));
        renderBoard();
      };

      const reloadTasks = async () => {
        if (state.isReloadingTasks) {
          return;
        }

        state.isReloadingTasks = true;
        try {
          const previousOffsets = new Map(
            state.stages.map((stage) => [stage.id, Math.max(TASKS_PAGE_SIZE, getStageMeta(stage.id)?.offset ?? TASKS_PAGE_SIZE)])
          );

          initializeStageTaskState();
          state.attachmentsByTaskId = new Map();

          for (const stage of state.stages) {
            const target = previousOffsets.get(stage.id) ?? TASKS_PAGE_SIZE;
            while ((getStageMeta(stage.id)?.offset ?? 0) < target && getStageMeta(stage.id)?.hasMore) {
              await loadMoreStageTasks(stage.id, { rerender: false });
            }
          }

          await rebuildAttachments();
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
        }, 200);
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

      const moveTaskInLoadedState = (sourceStageId, destinationStageId, taskId, destinationIndex) => {
        const sourceMeta = getStageMeta(sourceStageId);
        const destinationMeta = getStageMeta(destinationStageId);
        if (!sourceMeta || !destinationMeta) {
          return false;
        }

        const sourceTasks = [...sourceMeta.items];
        const sourceTaskIndex = sourceTasks.findIndex((task) => task.id === taskId);
        if (sourceTaskIndex === -1) {
          return false;
        }

        const [movedTask] = sourceTasks.splice(sourceTaskIndex, 1);
        const destinationTasks = sourceStageId === destinationStageId ? sourceTasks : [...destinationMeta.items];

        const boundedIndex = Math.max(0, Math.min(destinationIndex, destinationTasks.length));
        destinationTasks.splice(boundedIndex, 0, movedTask);

        sourceMeta.items = sourceTasks;
        destinationMeta.items = destinationTasks;
        return true;
      };

      const saveStageTasks = async (stageId, tasks) => {
        for (let index = 0; index < tasks.length; index += 1) {
          const task = tasks[index];
          await updateTask(task.id, {
            title: task.title,
            description: task.description,
            done: task.done,
            position: index,
            stageId
          });
        }
      };

      const persistMove = async (taskId, sourceStageId, destinationStageId, destinationIndex) => {
        const sourceFull = await getTasks(sourceStageId);
        const sourceTaskIndex = sourceFull.findIndex((task) => task.id === taskId);
        if (sourceTaskIndex === -1) {
          return;
        }

        const [movedTask] = sourceFull.splice(sourceTaskIndex, 1);

        if (sourceStageId === destinationStageId) {
          const bounded = Math.max(0, Math.min(destinationIndex, sourceFull.length));
          sourceFull.splice(bounded, 0, movedTask);
          await saveStageTasks(sourceStageId, sourceFull);
          return;
        }

        const destinationFull = await getTasks(destinationStageId);
        const existingIndex = destinationFull.findIndex((task) => task.id === taskId);
        if (existingIndex !== -1) {
          destinationFull.splice(existingIndex, 1);
        }

        const bounded = Math.max(0, Math.min(destinationIndex, destinationFull.length));
        destinationFull.splice(bounded, 0, { ...movedTask, stage_id: destinationStageId });

        await saveStageTasks(sourceStageId, sourceFull);
        await saveStageTasks(destinationStageId, destinationFull);
      };

      const openAddModal = (stageId) => {
        setText(taskModalTitle, 'Add Task');
        showTaskFormError('');
        state.activeDiscussionTaskId = null;
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
        renderAssigneeOptions('');
        if (taskDoneInput) {
          taskDoneInput.checked = false;
        }
        if (taskFilesInput) {
          taskFilesInput.value = '';
        }
        if (taskCommentInput) {
          taskCommentInput.value = '';
        }
        if (taskCommentsList) {
          taskCommentsList.innerHTML = '<p class="text-muted small mb-0">Save the task first to start discussing.</p>';
        }
        setHidden(taskDiscussion, true);
        taskModal.show();
      };

      const openEditModal = async (taskId, stageId) => {
        const task = (getStageMeta(stageId)?.items ?? []).find((entry) => entry.id === taskId);
        if (!task) {
          showInlineError('Task not found in loaded items. Scroll to load more tasks.');
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
        renderAssigneeOptions(task.assignee_id ?? '');
        if (taskDoneInput) {
          taskDoneInput.checked = Boolean(task.done);
        }
        if (taskFilesInput) {
          taskFilesInput.value = '';
        }
        if (taskCommentInput) {
          taskCommentInput.value = '';
        }
        setHidden(taskDiscussion, false);
        taskModal.show();
        await loadTaskDiscussion(task.id);
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
      state.currentUserId = user.id;

      try {
        const project = await getProject(params.id);
        setText(title, project?.title ?? 'Project');

        try {
          const projectUsers = await getProjectUsers(params.id);
          state.projectUsers = projectUsers;
          state.userEmailById = new Map(projectUsers.map((entry) => [entry.user_id, entry.email ?? 'Unknown user']));
        } catch {
          state.projectUsers = [];
          state.userEmailById = new Map();
        }

        state.stages = await getProjectStages(params.id);
        if (!state.stages.length) {
          if (board) {
            board.innerHTML = '';
          }
          setHidden(emptyState, false);
          return;
        }

        initializeStageTaskState();
        await preloadInitialStageTasks();

        if (activeTasksChannel && activeProjectId !== params.id) {
          cleanupActiveTasksChannel();
        }

        if (!activeTasksChannel) {
          const stageIds = new Set(state.stages.map((stage) => stage.id));
          activeTasksChannel = supabase
            .channel(`project-tasks-live:${params.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
              const newStageId = payload.new?.stage_id;
              const oldStageId = payload.old?.stage_id;
              if (stageIds.has(newStageId) || stageIds.has(oldStageId)) {
                scheduleRealtimeReload();
              }
            })
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

      filterMyTasksCheckbox?.addEventListener('change', () => {
        state.filterMyTasks = filterMyTasksCheckbox.checked;
        renderBoard();
      });

      board?.addEventListener('click', async (event) => {
        const addButton = event.target.closest('[data-add-task]');
        if (addButton) {
          const stageId = addButton.getAttribute('data-add-task');
          if (stageId) {
            openAddModal(stageId);
          }
          return;
        }

        const discussButton = event.target.closest('[data-discuss-task]');
        if (discussButton) {
          const taskId = discussButton.getAttribute('data-discuss-task');
          const stageId = discussButton.getAttribute('data-stage-id');
          if (taskId && stageId) {
            await openEditModal(taskId, stageId);
          }
          return;
        }

        const editButton = event.target.closest('[data-edit-task]');
        if (editButton) {
          const taskId = editButton.getAttribute('data-edit-task');
          const stageId = editButton.getAttribute('data-stage-id');
          if (taskId && stageId) {
            await openEditModal(taskId, stageId);
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

      board?.addEventListener(
        'scroll',
        async (event) => {
          const stageList = event.target.closest('[data-stage-list]');
          if (!stageList) {
            return;
          }

          if (stageList.scrollTop + stageList.clientHeight < stageList.scrollHeight - 80) {
            return;
          }

          const stageId = stageList.getAttribute('data-stage-list');
          if (!stageId) {
            return;
          }

          try {
            await loadMoreStageTasks(stageId);
          } catch (error) {
            showInlineError(error?.message ?? 'Unable to load more tasks.');
          }
        },
        true
      );

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
        const moved = moveTaskInLoadedState(sourceStageId, destinationStageId, taskId, destinationIndex);
        if (!moved) {
          return;
        }

        renderBoard();

        try {
          await persistMove(taskId, sourceStageId, destinationStageId, destinationIndex);
          await reloadTasks();
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
        const assigneeId = String(taskAssigneeInput?.value ?? '').trim() || null;
        const done = Boolean(taskDoneInput?.checked);
        const selectedFiles = Array.from(taskFilesInput?.files ?? []);

        if (!taskTitle) {
          showTaskFormError('Task title is required.');
          return;
        }

        try {
          let targetTaskId = '';

          if (mode === 'edit' && taskId) {
            const existingTask = (getStageMeta(stageId)?.items ?? []).find((task) => task.id === taskId);
            await updateTask(taskId, {
              title: taskTitle,
              description: taskDescription,
              assigneeId,
              done,
              position: existingTask?.position ?? 0,
              stageId
            });
            targetTaskId = taskId;
          } else {
            const nextPosition = getStageMeta(stageId)?.total ?? 0;
            const createdTask = await createTask(stageId, {
              title: taskTitle,
              description: taskDescription,
              assigneeId,
              done,
              position: nextPosition
            });
            targetTaskId = createdTask.id;
          }

          if (selectedFiles.length && targetTaskId) {
            await uploadTaskAttachments(targetTaskId, selectedFiles, state.currentUserId);
          }

          taskModal.hide();
          await reloadTasks();
        } catch (error) {
          showTaskFormError(error?.message ?? 'Unable to save task.');
        }
      });

      taskCommentForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const activeTaskId = state.activeDiscussionTaskId || String(taskIdInput?.value ?? '').trim();
        const content = String(taskCommentInput?.value ?? '').trim();

        if (!activeTaskId) {
          showTaskFormError('Save the task before adding comments.');
          return;
        }

        if (!content) {
          showTaskFormError('Comment cannot be empty.');
          return;
        }

        try {
          await createTaskComment(activeTaskId, content, state.currentUserId);
          if (taskCommentInput) {
            taskCommentInput.value = '';
          }
          showTaskFormError('');
          await loadTaskDiscussion(activeTaskId);
        } catch (error) {
          showTaskFormError(error?.message ?? 'Unable to post comment.');
        }
      });

      taskCommentsList?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('[data-delete-comment]');
        if (!deleteButton) {
          return;
        }

        const commentId = deleteButton.getAttribute('data-delete-comment');
        if (!commentId) {
          return;
        }

        try {
          await deleteTaskComment(commentId);
          if (state.activeDiscussionTaskId) {
            await loadTaskDiscussion(state.activeDiscussionTaskId);
          }
        } catch (error) {
          showTaskFormError(error?.message ?? 'Unable to delete comment.');
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
