import './dashboard.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser } from '../../services/auth.js';
import { createProject, getProjects } from '../../services/projects.js';
import { getAllUserTasks } from '../../services/tasks.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showSuccess, showError as showErrorToast } from '../../services/toast.js';

export async function render() {
  const html = await loadHtml(new URL('./dashboard.html', import.meta.url));
  return {
    html,
    onMount() {
      const list = document.querySelector('[data-board-list]');
      const authRequired = document.querySelector('[data-auth-required]');
      const emptyState = document.querySelector('[data-empty-state]');
      const errorBox = document.querySelector('[data-board-error]');
      const formWrapper = document.querySelector('[data-board-form]');
      const form = document.querySelector('[data-board-create-form]');
      const feedback = document.querySelector('[data-board-feedback]');
      const createButton = document.querySelector('[data-create-board]');
      const cancelButton = document.querySelector('[data-board-cancel]');
      const statsSection = document.querySelector('[data-stats-section]');
      const statProjects = document.querySelector('[data-stat-projects]');
      const statOpenTasks = document.querySelector('[data-stat-open-tasks]');
      const statDoneTasks = document.querySelector('[data-stat-done-tasks]');

      const showError = (message) => {
        setText(errorBox, message);
        setHidden(errorBox, !message);
        if (message) {
          showErrorToast(message);
        }
      };

      const updateStatistics = (projects, tasks) => {
        const openTasks = tasks.filter(task => !task.done).length;
        const doneTasks = tasks.filter(task => task.done).length;
        
        setText(statProjects, projects.length.toString());
        setText(statOpenTasks, openTasks.toString());
        setText(statDoneTasks, doneTasks.toString());
      };

      const renderProjects = (projects) => {
        if (!list) {
          return;
        }

        list.innerHTML = projects
          .map(
            (project) => `
            <div class="col-md-6 col-xl-4">
              <article class="glass-card board-card">
                <div class="board-card__meta">
                  <span class="badge-tag">Project</span>
                  <span class="text-muted">${new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <h3 class="h5 section-title">${project.title}</h3>
                <p>${project.description || 'No description yet.'}</p>
                <a class="stretched-link" href="/projects/${project.id}/tasks" data-link>View tasks</a>
              </article>
            </div>
          `
          )
          .join('');
      };

      const toggleForm = (show) => {
        setHidden(formWrapper, !show);
        if (show) {
          form?.querySelector('#board-name')?.focus();
        }
      };

      const loadProjects = async () => {
        showError('');
        setHidden(authRequired, true);
        setHidden(emptyState, true);

        const user = await getCurrentUser();
        if (!user) {
          setHidden(authRequired, false);
          setHidden(statsSection, true);
          renderProjects([]);
          return;
        }

        try {
          const [projects, tasks] = await Promise.all([
            getProjects(),
            getAllUserTasks()
          ]);
          
          renderProjects(projects);
          updateStatistics(projects, tasks);
          setHidden(emptyState, projects.length > 0);
          setHidden(statsSection, false);
        } catch (error) {
          showError(error?.message ?? 'Unable to load projects.');
        }
      };

      createButton?.addEventListener('click', () => toggleForm(true));
      cancelButton?.addEventListener('click', () => toggleForm(false));

      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        showError('');
        setText(feedback, 'Saving...');

        const formData = new FormData(form);
        const name = String(formData.get('name') || '').trim();
        const description = String(formData.get('description') || '').trim();

        const user = await getCurrentUser();
        if (!user) {
          showError('Please sign in before creating a board.');
          setText(feedback, '');
          return;
        }

        if (!name) {
          showError('Board name is required.');
          setText(feedback, '');
          return;
        }

        try {
          await createProject({ title: name, description, userId: user.id });
          showSuccess('Project created successfully!');
          form.reset();
          toggleForm(false);
          setText(feedback, '');
          await loadProjects();
        } catch (error) {
          showError(error?.message ?? 'Unable to create project.');
          setText(feedback, '');
        }
      });

      window.addEventListener('auth:changed', loadProjects);
      loadProjects();
    }
  };
}
