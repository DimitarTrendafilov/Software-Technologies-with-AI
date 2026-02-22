import './projects.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { deleteProject, getProjectsPaged, getProjectSummaries } from '../../services/projects.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError as showErrorToast, showSuccess } from '../../services/toast.js';

export async function render() {
  const html = await loadHtml(new URL('./projects.html', import.meta.url));

  return {
    html,
    onMount() {
      const authRequired = document.querySelector('[data-auth-required]');
      const errorBox = document.querySelector('[data-projects-error]');
      const tableWrap = document.querySelector('[data-projects-table-wrap]');
      const rows = document.querySelector('[data-projects-rows]');
      const emptyState = document.querySelector('[data-empty-state]');
      const pagination = document.querySelector('[data-projects-pagination]');
      const prevButton = document.querySelector('[data-projects-prev]');
      const nextButton = document.querySelector('[data-projects-next]');
      const pageInfo = document.querySelector('[data-projects-page-info]');

      const state = {
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
        currentUserId: ''
      };

      const showError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showErrorToast(message);
        }
      };

      const renderPagination = () => {
        setHidden(pagination, state.totalCount === 0);
        setText(pageInfo, `Page ${state.page} of ${state.totalPages}`);
        if (prevButton) {
          prevButton.disabled = state.page <= 1;
        }
        if (nextButton) {
          nextButton.disabled = state.page >= state.totalPages;
        }
      };

      const loadProjects = async (page = state.page) => {
        showError('');
        setHidden(authRequired, true);
        setHidden(tableWrap, true);
        setHidden(emptyState, true);
        setHidden(pagination, true);

        const user = await getCurrentUser();
        if (!user) {
          setHidden(authRequired, false);
          return;
        }
        state.currentUserId = user.id;

        try {
          const pageResult = await getProjectsPaged({ page, pageSize: state.pageSize });
          const projects = pageResult.items;

          state.page = pageResult.page;
          state.totalCount = pageResult.totalCount;
          state.totalPages = Math.max(1, Math.ceil(state.totalCount / state.pageSize));

          if (!projects.length) {
            rows.innerHTML = '';
            setHidden(emptyState, false);
            renderPagination();
            return;
          }

          const summaries = await getProjectSummaries(projects.map((project) => project.id));
          const summaryMap = new Map(summaries.map((summary) => [summary.project_id, summary]));

          rows.innerHTML = projects
            .map((project, index) => {
              const counts = summaryMap.get(project.id) ?? {
                stages_count: 0,
                open_tasks: 0,
                done_tasks: 0
              };
              const isOwner = project.owner_id === state.currentUserId;
              const canManageProject = isOwner || !project.owner_id;

              return `
                <tr>
                  <td>
                    <span class="projects-title">${project.title}</span>
                  </td>
                  <td>${counts.open_tasks}</td>
                  <td>${counts.done_tasks}</td>
                  <td>${counts.stages_count}</td>
                  <td class="text-end projects-actions">
                    <a class="btn btn-sm btn-outline-secondary" href="/project/${project.id}/tasks" data-link>View Tasks</a>
                    ${canManageProject ? `<a class="btn btn-sm btn-outline-dark" href="/projects/${project.id}/users" data-link>Users</a>` : ''}
                    ${canManageProject ? `<a class="btn btn-sm btn-outline-primary" href="/project/${project.id}/edit" data-link>Edit</a>` : ''}
                    ${canManageProject ? `<button class="btn btn-sm btn-outline-danger" type="button" data-delete-project="${project.id}" data-project-title="${project.title}">Delete</button>` : ''}
                  </td>
                </tr>
              `;
            })
            .join('');

          setHidden(tableWrap, false);
          setHidden(emptyState, true);
          renderPagination();
        } catch (error) {
          showError(error?.message ?? 'Unable to load projects.');
        }
      };

      rows?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('[data-delete-project]');
        if (!deleteButton) {
          return;
        }

        const projectId = deleteButton.getAttribute('data-delete-project');
        const projectTitle = deleteButton.getAttribute('data-project-title') ?? 'this project';
        const confirmed = window.confirm(`Delete \"${projectTitle}\"? This action cannot be undone.`);

        if (!confirmed) {
          return;
        }

        try {
          await deleteProject(projectId);
          showSuccess('Project deleted successfully.');

          const maxPageAfterDelete = Math.max(1, Math.ceil((state.totalCount - 1) / state.pageSize));
          const nextPage = Math.min(state.page, maxPageAfterDelete);
          await loadProjects(nextPage);
        } catch (error) {
          showError(error?.message ?? 'Unable to delete project.');
        }
      });

      prevButton?.addEventListener('click', async () => {
        if (state.page <= 1) {
          return;
        }
        await loadProjects(state.page - 1);
      });

      nextButton?.addEventListener('click', async () => {
        if (state.page >= state.totalPages) {
          return;
        }
        await loadProjects(state.page + 1);
      });

      loadProjects();
    }
  };
}
