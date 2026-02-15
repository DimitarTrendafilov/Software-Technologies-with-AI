import './admin.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { deleteProject, getProjects, updateProject } from '../../services/projects.js';
import { deleteTask, updateProjectStage, updateTask, deleteProjectStage } from '../../services/tasks.js';
import {
  deleteUserAdmin,
  isAdminUser,
  listStagesAdmin,
  listTasksAdmin,
  listUsersAdmin,
  updateUserAdmin
} from '../../services/admin.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError, showSuccess } from '../../services/toast.js';
import Modal from 'bootstrap/js/dist/modal';

export async function render() {
  const html = await loadHtml(new URL('./admin.html', import.meta.url));

  return {
    html,
    async onMount() {
      const state = {
        projects: [],
        stages: [],
        tasks: [],
        users: [],
        selectedProjectId: '',
        editContext: null,
        deleteContext: null
      };

      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-admin-error]');
      const adminContent = document.querySelector('[data-admin-content]');
      const projectSelect = document.querySelector('[data-admin-project-select]');
      const projectRows = document.querySelector('[data-admin-project-rows]');
      const stageRows = document.querySelector('[data-admin-stage-rows]');
      const taskRows = document.querySelector('[data-admin-task-rows]');
      const userRows = document.querySelector('[data-admin-user-rows]');

      const editModalTitle = document.querySelector('[data-admin-edit-title]');
      const editForm = document.querySelector('[data-admin-edit-form]');
      const editFields = document.querySelector('[data-admin-edit-fields]');
      const editError = document.querySelector('[data-admin-edit-error]');
      const deleteMessage = document.querySelector('[data-admin-delete-message]');
      const confirmDeleteBtn = document.querySelector('[data-admin-confirm-delete]');

      const editModal = new Modal(document.getElementById('adminEditModal'));
      const deleteModal = new Modal(document.getElementById('adminDeleteModal'));

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

      const showEditError = (message) => {
        setText(editError, message);
        setHidden(editError, !message);
      };

      const renderProjects = () => {
        if (!projectRows) return;

        projectRows.innerHTML = state.projects
          .map(
            (project) => `
              <tr>
                <td>${escapeHtml(project.title)}</td>
                <td>${escapeHtml(project.description || '')}</td>
                <td>${escapeHtml(project.owner_id || '')}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" data-edit-project="${project.id}" type="button">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" data-delete-project="${project.id}" type="button">Delete</button>
                </td>
              </tr>
            `
          )
          .join('');
      };

      const renderStages = () => {
        if (!stageRows) return;

        stageRows.innerHTML = state.stages
          .map(
            (stage) => `
              <tr>
                <td>${escapeHtml(stage.name)}</td>
                <td>${stage.position}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" data-edit-stage="${stage.id}" type="button">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" data-delete-stage="${stage.id}" type="button">Delete</button>
                </td>
              </tr>
            `
          )
          .join('');
      };

      const renderTasks = () => {
        if (!taskRows) return;

        const stageMap = new Map(state.stages.map((stage) => [stage.id, stage.name]));

        taskRows.innerHTML = state.tasks
          .map(
            (task) => `
              <tr>
                <td>${escapeHtml(task.title)}</td>
                <td>${escapeHtml(stageMap.get(task.stage_id) || task.stage_id)}</td>
                <td>${task.done ? 'Yes' : 'No'}</td>
                <td>${task.position}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" data-edit-task="${task.id}" type="button">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" data-delete-task="${task.id}" type="button">Delete</button>
                </td>
              </tr>
            `
          )
          .join('');
      };

      const renderUsers = () => {
        if (!userRows) return;

        userRows.innerHTML = state.users
          .map(
            (user) => `
              <tr>
                <td>${escapeHtml(user.email || '')}</td>
                <td>${escapeHtml(user.role || 'user')}</td>
                <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" data-edit-user="${user.id}" type="button">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" data-delete-user="${user.id}" type="button">Delete</button>
                </td>
              </tr>
            `
          )
          .join('');
      };

      const renderProjectSelect = () => {
        if (!projectSelect) return;

        projectSelect.innerHTML = state.projects
          .map((project) => `<option value="${project.id}">${escapeHtml(project.title)}</option>`)
          .join('');

        if (!state.selectedProjectId && state.projects.length) {
          state.selectedProjectId = state.projects[0].id;
        }

        projectSelect.value = state.selectedProjectId;
      };

      const loadProjectAssets = async () => {
        if (!state.selectedProjectId) {
          state.stages = [];
          state.tasks = [];
          renderStages();
          renderTasks();
          return;
        }

        state.stages = await listStagesAdmin(state.selectedProjectId);
        state.tasks = await listTasksAdmin(state.selectedProjectId);
        renderStages();
        renderTasks();
      };

      const loadAll = async () => {
        state.projects = await getProjects();
        state.users = await listUsersAdmin();

        if (state.selectedProjectId && !state.projects.some((project) => project.id === state.selectedProjectId)) {
          state.selectedProjectId = state.projects[0]?.id ?? '';
        }

        renderProjects();
        renderUsers();
        renderProjectSelect();
        await loadProjectAssets();
      };

      const openEditModal = (context) => {
        state.editContext = context;
        showEditError('');

        if (context.type === 'project') {
          setText(editModalTitle, 'Edit project');
          editFields.innerHTML = `
            <div>
              <label class="form-label" for="admin-project-title">Title</label>
              <input class="form-control" id="admin-project-title" name="title" value="${escapeHtml(context.value.title || '')}" required />
            </div>
            <div>
              <label class="form-label" for="admin-project-description">Description</label>
              <textarea class="form-control" id="admin-project-description" name="description" rows="3">${escapeHtml(context.value.description || '')}</textarea>
            </div>
          `;
        }

        if (context.type === 'stage') {
          setText(editModalTitle, 'Edit stage');
          editFields.innerHTML = `
            <div>
              <label class="form-label" for="admin-stage-name">Name</label>
              <input class="form-control" id="admin-stage-name" name="name" value="${escapeHtml(context.value.name || '')}" required />
            </div>
            <div>
              <label class="form-label" for="admin-stage-position">Position</label>
              <input class="form-control" id="admin-stage-position" name="position" type="number" value="${context.value.position ?? 0}" required />
            </div>
          `;
        }

        if (context.type === 'task') {
          const stageOptions = state.stages
            .map(
              (stage) =>
                `<option value="${stage.id}" ${stage.id === context.value.stage_id ? 'selected' : ''}>${escapeHtml(stage.name)}</option>`
            )
            .join('');

          setText(editModalTitle, 'Edit task');
          editFields.innerHTML = `
            <div>
              <label class="form-label" for="admin-task-title">Title</label>
              <input class="form-control" id="admin-task-title" name="title" value="${escapeHtml(context.value.title || '')}" required />
            </div>
            <div>
              <label class="form-label" for="admin-task-description">Description</label>
              <textarea class="form-control" id="admin-task-description" name="description" rows="3">${escapeHtml(context.value.description || '')}</textarea>
            </div>
            <div>
              <label class="form-label" for="admin-task-stage">Stage</label>
              <select class="form-select" id="admin-task-stage" name="stageId">${stageOptions}</select>
            </div>
            <div>
              <label class="form-label" for="admin-task-position">Position</label>
              <input class="form-control" id="admin-task-position" name="position" type="number" value="${context.value.position ?? 0}" required />
            </div>
            <div class="form-check">
              <input class="form-check-input" id="admin-task-done" name="done" type="checkbox" ${context.value.done ? 'checked' : ''} />
              <label class="form-check-label" for="admin-task-done">Completed</label>
            </div>
          `;
        }

        if (context.type === 'user') {
          setText(editModalTitle, 'Edit user');
          editFields.innerHTML = `
            <div>
              <label class="form-label" for="admin-user-email">Email</label>
              <input class="form-control" id="admin-user-email" name="email" value="${escapeHtml(context.value.email || '')}" required />
            </div>
            <div>
              <label class="form-label" for="admin-user-role">Role</label>
              <select class="form-select" id="admin-user-role" name="role">
                <option value="user" ${context.value.role === 'admin' ? '' : 'selected'}>user</option>
                <option value="admin" ${context.value.role === 'admin' ? 'selected' : ''}>admin</option>
              </select>
            </div>
          `;
        }

        editModal.show();
      };

      const openDeleteModal = ({ type, id, label }) => {
        state.deleteContext = { type, id };
        setText(deleteMessage, `Delete ${label}?`);
        deleteModal.show();
      };

      setHidden(authRequired, true);
      setHidden(adminContent, true);
      showInlineError('');

      const user = await getCurrentUser();
      if (!user) {
        setHidden(authRequired, false);
        return;
      }

      if (!isAdminUser(user)) {
        showInlineError('Access denied. Admin role is required.');
        return;
      }

      try {
        await loadAll();
        setHidden(adminContent, false);
      } catch (error) {
        showInlineError(error?.message ?? 'Unable to load admin data.');
      }

      projectSelect?.addEventListener('change', async () => {
        state.selectedProjectId = projectSelect.value;
        try {
          await loadProjectAssets();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to load project assets.');
        }
      });

      projectRows?.addEventListener('click', (event) => {
        const editBtn = event.target.closest('[data-edit-project]');
        if (editBtn) {
          const projectId = editBtn.getAttribute('data-edit-project');
          const project = state.projects.find((entry) => entry.id === projectId);
          if (!project) return;
          openEditModal({ type: 'project', id: projectId, value: project });
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-project]');
        if (!deleteBtn) return;
        const projectId = deleteBtn.getAttribute('data-delete-project');
        openDeleteModal({ type: 'project', id: projectId, label: 'project' });
      });

      stageRows?.addEventListener('click', (event) => {
        const editBtn = event.target.closest('[data-edit-stage]');
        if (editBtn) {
          const stageId = editBtn.getAttribute('data-edit-stage');
          const stage = state.stages.find((entry) => entry.id === stageId);
          if (!stage) return;
          openEditModal({ type: 'stage', id: stageId, value: stage });
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-stage]');
        if (!deleteBtn) return;
        const stageId = deleteBtn.getAttribute('data-delete-stage');
        openDeleteModal({ type: 'stage', id: stageId, label: 'stage' });
      });

      taskRows?.addEventListener('click', (event) => {
        const editBtn = event.target.closest('[data-edit-task]');
        if (editBtn) {
          const taskId = editBtn.getAttribute('data-edit-task');
          const task = state.tasks.find((entry) => entry.id === taskId);
          if (!task) return;
          openEditModal({ type: 'task', id: taskId, value: task });
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-task]');
        if (!deleteBtn) return;
        const taskId = deleteBtn.getAttribute('data-delete-task');
        openDeleteModal({ type: 'task', id: taskId, label: 'task' });
      });

      userRows?.addEventListener('click', (event) => {
        const editBtn = event.target.closest('[data-edit-user]');
        if (editBtn) {
          const userId = editBtn.getAttribute('data-edit-user');
          const targetUser = state.users.find((entry) => entry.id === userId);
          if (!targetUser) return;
          openEditModal({ type: 'user', id: userId, value: targetUser });
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-user]');
        if (!deleteBtn) return;
        const userId = deleteBtn.getAttribute('data-delete-user');
        openDeleteModal({ type: 'user', id: userId, label: 'user account' });
      });

      editForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        showEditError('');

        if (!state.editContext) {
          return;
        }

        try {
          if (state.editContext.type === 'project') {
            const title = String(editFields.querySelector('[name="title"]')?.value ?? '').trim();
            const description = String(editFields.querySelector('[name="description"]')?.value ?? '').trim();
            if (!title) {
              showEditError('Title is required.');
              return;
            }

            await updateProject(state.editContext.id, { title, description });
            await loadAll();
            showSuccess('Project updated.');
          }

          if (state.editContext.type === 'stage') {
            const name = String(editFields.querySelector('[name="name"]')?.value ?? '').trim();
            const position = Number.parseInt(String(editFields.querySelector('[name="position"]')?.value ?? ''), 10);
            if (!name) {
              showEditError('Stage name is required.');
              return;
            }
            if (Number.isNaN(position)) {
              showEditError('Position must be a number.');
              return;
            }

            await updateProjectStage(state.editContext.id, { name, position });
            await loadProjectAssets();
            showSuccess('Stage updated.');
          }

          if (state.editContext.type === 'task') {
            const title = String(editFields.querySelector('[name="title"]')?.value ?? '').trim();
            const description = String(editFields.querySelector('[name="description"]')?.value ?? '').trim();
            const stageId = String(editFields.querySelector('[name="stageId"]')?.value ?? '').trim();
            const position = Number.parseInt(String(editFields.querySelector('[name="position"]')?.value ?? ''), 10);
            const done = Boolean(editFields.querySelector('[name="done"]')?.checked);

            if (!title) {
              showEditError('Task title is required.');
              return;
            }
            if (Number.isNaN(position)) {
              showEditError('Position must be a number.');
              return;
            }

            await updateTask(state.editContext.id, {
              title,
              description,
              done,
              position,
              stageId
            });
            await loadProjectAssets();
            showSuccess('Task updated.');
          }

          if (state.editContext.type === 'user') {
            const email = String(editFields.querySelector('[name="email"]')?.value ?? '').trim();
            const role = String(editFields.querySelector('[name="role"]')?.value ?? 'user').trim();
            if (!email) {
              showEditError('Email is required.');
              return;
            }

            await updateUserAdmin({
              userId: state.editContext.id,
              email,
              role: role === 'admin' ? 'admin' : 'user'
            });
            await loadAll();
            showSuccess('User updated.');
          }

          state.editContext = null;
          editModal.hide();
        } catch (error) {
          showEditError(error?.message ?? 'Unable to save changes.');
        }
      });

      confirmDeleteBtn?.addEventListener('click', async () => {
        if (!state.deleteContext) {
          return;
        }

        try {
          if (state.deleteContext.type === 'project') {
            await deleteProject(state.deleteContext.id);
            await loadAll();
            showSuccess('Project deleted.');
          }

          if (state.deleteContext.type === 'stage') {
            await deleteProjectStage(state.deleteContext.id);
            await loadProjectAssets();
            showSuccess('Stage deleted.');
          }

          if (state.deleteContext.type === 'task') {
            await deleteTask(state.deleteContext.id);
            await loadProjectAssets();
            showSuccess('Task deleted.');
          }

          if (state.deleteContext.type === 'user') {
            await deleteUserAdmin(state.deleteContext.id);
            await loadAll();
            showSuccess('User deleted.');
          }

          state.deleteContext = null;
          deleteModal.hide();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to delete item.');
        }
      });
    }
  };
}
