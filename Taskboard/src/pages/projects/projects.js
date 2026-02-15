import './projects.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { deleteProject, getProjects } from '../../services/projects.js';
import { getProjectStages, getTasks } from '../../services/tasks.js';
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

      const showError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showErrorToast(message);
        }
      };

      const getProjectMetrics = async (projectId) => {
        const stages = await getProjectStages(projectId);
        let openTasks = 0;
        let doneTasks = 0;

        const tasksByStage = await Promise.all(stages.map((stage) => getTasks(stage.id)));

        tasksByStage.forEach((tasks) => {
          tasks.forEach((task) => {
            if (task.done) {
              doneTasks += 1;
            } else {
              openTasks += 1;
            }
          });
        });

        return {
          stages: stages.length,
          openTasks,
          doneTasks
        };
      };

      const loadProjects = async () => {
        showError('');
        setHidden(authRequired, true);
        setHidden(tableWrap, true);
        setHidden(emptyState, true);

        const user = await getCurrentUser();
        if (!user) {
          setHidden(authRequired, false);
          return;
        }

        try {
          const projects = await getProjects();

          if (!projects.length) {
            rows.innerHTML = '';
            setHidden(emptyState, false);
            return;
          }

          const metrics = await Promise.all(projects.map((project) => getProjectMetrics(project.id)));

          rows.innerHTML = projects
            .map((project, index) => {
              const counts = metrics[index];

              return `
                <tr>
                  <td>
                    <span class="projects-title">${project.title}</span>
                  </td>
                  <td>${counts.openTasks}</td>
                  <td>${counts.doneTasks}</td>
                  <td>${counts.stages}</td>
                  <td class="text-end projects-actions">
                    <a class="btn btn-sm btn-outline-secondary" href="/project/${project.id}/tasks" data-link>View Tasks</a>
                    <a class="btn btn-sm btn-outline-primary" href="/project/${project.id}/edit" data-link>Edit</a>
                    <button class="btn btn-sm btn-outline-danger" type="button" data-delete-project="${project.id}" data-project-title="${project.title}">Delete</button>
                  </td>
                </tr>
              `;
            })
            .join('');

          setHidden(tableWrap, false);
          setHidden(emptyState, true);
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
          await loadProjects();
        } catch (error) {
          showError(error?.message ?? 'Unable to delete project.');
        }
      });

      loadProjects();
    }
  };
}
