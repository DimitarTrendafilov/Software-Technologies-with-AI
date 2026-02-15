import './admin.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { deleteProject, getProjects, updateProject } from '../../services/projects.js';
import { deleteTask, updateProjectStage, updateTask, deleteProjectStage } from '../../services/tasks.js';
import { deleteUserAdmin, isAdminUser, listStagesAdmin, listTasksAdmin, listUsersAdmin, updateUserAdmin } from '../../services/admin.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError, showSuccess } from '../../services/toast.js';

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
        selectedProjectId: ''
      };

      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-admin-error]');
      const adminContent = document.querySelector('[data-admin-content]');
      const projectSelect = document.querySelector('[data-admin-project-select]');
      const projectRows = document.querySelector('[data-admin-project-rows]');
      const stageRows = document.querySelector('[data-admin-stage-rows]');
      const taskRows = document.querySelector('[data-admin-task-rows]');
      const userRows = document.querySelector('[data-admin-user-rows]');

      const showInlineError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showError(message);
        }
      };

      const renderProjects = () => {
        if (!projectRows) return;

        projectRows.innerHTML = state.projects
          .map(
            (project) => `
              <tr>
                <td>${project.title}</td>
                <td>${project.description || ''}</td>
                <td>${project.owner_id || ''}</td>
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
                <td>${stage.name}</td>
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
                <td>${task.title}</td>
                <td>${stageMap.get(task.stage_id) || task.stage_id}</td>
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
                <td>${user.email || ''}</td>
                <td>${user.role || 'user'}</td>
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
          .map((project) => `<option value="${project.id}">${project.title}</option>`)
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

      projectRows?.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('[data-edit-project]');
        if (editBtn) {
          const projectId = editBtn.getAttribute('data-edit-project');
          const project = state.projects.find((entry) => entry.id === projectId);
          if (!project) return;

          const title = window.prompt('Project title', project.title ?? '');
          if (title === null) return;
          const description = window.prompt('Project description', project.description ?? '');
          if (description === null) return;

          try {
            await updateProject(projectId, { title: title.trim(), description: description.trim() });
            showSuccess('Project updated.');
            await loadAll();
          } catch (error) {
            showInlineError(error?.message ?? 'Unable to update project.');
          }
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-project]');
        if (!deleteBtn) return;

        const projectId = deleteBtn.getAttribute('data-delete-project');
        if (!window.confirm('Delete project?')) return;

        try {
          await deleteProject(projectId);
          showSuccess('Project deleted.');
          await loadAll();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to delete project.');
        }
      });

      stageRows?.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('[data-edit-stage]');
        if (editBtn) {
          const stageId = editBtn.getAttribute('data-edit-stage');
          const stage = state.stages.find((entry) => entry.id === stageId);
          if (!stage) return;

          const name = window.prompt('Stage name', stage.name ?? '');
          if (name === null) return;
          const positionRaw = window.prompt('Stage position', String(stage.position ?? 0));
          if (positionRaw === null) return;
          const position = Number.parseInt(positionRaw, 10);

          if (Number.isNaN(position)) {
            showInlineError('Position must be a number.');
            return;
          }

          try {
            await updateProjectStage(stageId, { name: name.trim(), position });
            showSuccess('Stage updated.');
            await loadProjectAssets();
          } catch (error) {
            showInlineError(error?.message ?? 'Unable to update stage.');
          }
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-stage]');
        if (!deleteBtn) return;

        const stageId = deleteBtn.getAttribute('data-delete-stage');
        if (!window.confirm('Delete stage?')) return;

        try {
          await deleteProjectStage(stageId);
          showSuccess('Stage deleted.');
          await loadProjectAssets();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to delete stage.');
        }
      });

      taskRows?.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('[data-edit-task]');
        if (editBtn) {
          const taskId = editBtn.getAttribute('data-edit-task');
          const task = state.tasks.find((entry) => entry.id === taskId);
          if (!task) return;

          const title = window.prompt('Task title', task.title ?? '');
          if (title === null) return;
          const description = window.prompt('Task description', task.description ?? '');
          if (description === null) return;
          const doneInput = window.prompt('Task done? yes/no', task.done ? 'yes' : 'no');
          if (doneInput === null) return;
          const done = doneInput.trim().toLowerCase() === 'yes';

          try {
            await updateTask(taskId, {
              title: title.trim(),
              description: description.trim(),
              done,
              position: task.position,
              stageId: task.stage_id
            });
            showSuccess('Task updated.');
            await loadProjectAssets();
          } catch (error) {
            showInlineError(error?.message ?? 'Unable to update task.');
          }
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-task]');
        if (!deleteBtn) return;

        const taskId = deleteBtn.getAttribute('data-delete-task');
        if (!window.confirm('Delete task?')) return;

        try {
          await deleteTask(taskId);
          showSuccess('Task deleted.');
          await loadProjectAssets();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to delete task.');
        }
      });

      userRows?.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('[data-edit-user]');
        if (editBtn) {
          const userId = editBtn.getAttribute('data-edit-user');
          const targetUser = state.users.find((entry) => entry.id === userId);
          if (!targetUser) return;

          const email = window.prompt('User email', targetUser.email ?? '');
          if (email === null) return;
          const role = window.prompt('Role (admin/user)', targetUser.role ?? 'user');
          if (role === null) return;

          try {
            await updateUserAdmin({
              userId,
              email: email.trim(),
              role: role.trim().toLowerCase() === 'admin' ? 'admin' : 'user'
            });
            showSuccess('User updated.');
            await loadAll();
          } catch (error) {
            showInlineError(error?.message ?? 'Unable to update user.');
          }
          return;
        }

        const deleteBtn = event.target.closest('[data-delete-user]');
        if (!deleteBtn) return;

        const userId = deleteBtn.getAttribute('data-delete-user');
        if (!window.confirm('Delete user account?')) return;

        try {
          await deleteUserAdmin(userId);
          showSuccess('User deleted.');
          await loadAll();
        } catch (error) {
          showInlineError(error?.message ?? 'Unable to delete user.');
        }
      });
    }
  };
}
